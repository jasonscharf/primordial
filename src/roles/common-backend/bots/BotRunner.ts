import { DateTime } from "luxon";
import { Knex } from "knex";
import env from "../env";
import { ApiBacktestHandle } from "../../common/messages/trading";
import { BacktestRequest } from "../messages/testing";
import { BotContext, botIdentifier, buildBacktestingContext, buildBotContext, buildBotContextForSignalsComputation } from "./BotContext";
import { BotDefinition } from "../../common/models/bots/BotDefinition";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotImplementation } from "./BotImplementation";
import { BotMode } from "../../common/models/system/Strategy";
import { BotRun } from "../../common/models/bots/BotRun";
import { BotRunReport } from "../../common/models/bots/BotSummaryResults";
import { GenomeParser } from "../genetics/GenomeParser";
import { Money } from "../../common/numbers";
import { Order, OrderType } from "../../common/models/markets/Order";
import { Price } from "../../common/models/markets/Price";
import { PriceDataParameters } from "../../common/models/system/PriceDataParameters";
import { PriceEntity } from "../../common/entities/PriceEntity";
import { PriceUpdateMessage } from "../messages/trading";
import { RunState } from "../../common/models/system/RunState";
import { SymbolResultSet } from "../../common/models/system/SymbolResultSet";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { TimeSeriesCache, TimeSeriesCacheArgs } from "../system/TimeSeriesCache";
import { botFactory } from "./RobotFactory";
import { cache, capital, db, log, results, strats, sym, users } from "../includes";
import { human, millisecondsPerResInterval, normalizePriceTime } from "../../common/utils/time";
import { genes, names } from "../genetics/base-genetics";
import { version } from "../../common/version";
import { isNullOrUndefined } from "../utils";
import { measure } from "../../common/utils/perf";



export const DEFAULT_NEW_BOT_DEF_PROPS: Partial<BotDefinition> = {
};

export const DEFAULT_NEW_BOT_INSTANCE_PROPS: Partial<BotInstance> = {
    runState: RunState.NEW,
    modeId: BotMode.BACK_TEST,
    exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
};


export interface IndicatorsAndSignals {
    signals: number[];
    indicators: {};
    prices: Price[];
}

const DEFAULT_CACHE_ARGS: TimeSeriesCacheArgs = {
    accessor: (price: Price) => {
        if (!price) {
            debugger;
        }
        return price.ts;
    },
    maxItemsPerKey: 1000,
    maxKeys: 100,
    checkForGaps: false,
};

/**
 * Handles running of bots.
 */
export class BotRunner {
    protected static _tsc = new TimeSeriesCache<Price>(DEFAULT_CACHE_ARGS);

    /**
     * Ticks a stateful trading bot.
     * @param def 
     * @param instanceRecord 
     * @param price 
     */
    async tickBot(def: BotDefinition, instanceRecord: BotInstance, price: PriceUpdateMessage, trx: Knex.Transaction) {
        const start = Date.now();

        const profile = env.isDev() && false;
        if (profile) {
            console.profile(`Tick ${botIdentifier(instanceRecord)}`);
        }
        try {
            const run: BotRun = await strats.getLatestRunForInstance(instanceRecord.id);
            const ctx = await buildBotContext(def, instanceRecord, run);
            ctx.trx = trx;

            // TODO: Extract to BotRunner facility

            const { genome } = ctx;
            const symbolPair = instanceRecord.symbols;
            const impl = genome.getGene<string>(genes.META_IMPL).value;
            const res = instanceRecord.resId;
            const instance = botFactory.create(impl) as BotImplementation;


            // Initialize new bots in a transaction to ensure we don't initialize it multiple times
            if (instanceRecord.runState === RunState.INITIALIZING) {
                try {
                    log.info(`Initializing ${botIdentifier(instanceRecord)}`);

                    const newState = await instance.initialize(ctx);
                    ctx.state = newState;

                    if (newState) {
                        instanceRecord.stateJson = newState;
                    }

                    instanceRecord.runState = RunState.ACTIVE;
                    instanceRecord.prevTick = new Date();

                    await strats.updateBotInstance(instanceRecord, trx);
                }
                catch (err) {
                    log.error(`Error initializing ${botIdentifier(instanceRecord)}. Rolling back...`, err);

                    instanceRecord.runState = RunState.ERROR;
                    //await trx.rollback();
                    await strats.updateBotInstance(instanceRecord, trx);
                }
            }

            if (instanceRecord.runState === RunState.ACTIVE) {
                const maxHistoricals = genome.getGene<number>("TIME", "MI").value;
                const now = Date.now();
                const end = normalizePriceTime(res, new Date(now)).getTime();
                const intervalMs = millisecondsPerResInterval(res);
                const start = end - (intervalMs * maxHistoricals);

                // Update price history. Note: This is *definitely* a case for optimization.
                // Let's grab the previous N for now, until some sort of caching/progressive solution
                // can be executed cross-node (b/c bots run on multiple machines)
                const params: PriceDataParameters = {
                    exchange: env.PRIMO_DEFAULT_EXCHANGE,
                    res,
                    symbolPair,
                    fillMissing: true,
                    from: new Date(start),
                    to: new Date(end - 1),
                };

                // Pull prices from the cache / update cache
                const key = instanceRecord.id;
                const entry = BotRunner._tsc.getEntry(key);
                let prices: Price[];

                // No entry? Pull and cache.
                if (!entry) {
                    const sus = await sym.getSymbolPriceData(params);

                    // TODO: Missing ranges

                    prices = sus.prices;
                    BotRunner._tsc.append(key, prices);
                }
                else {
                    prices = BotRunner._tsc.getCachedRange(key, params.from, new Date(end)).slice();
                    const normalizedPriceTime = normalizePriceTime(res, price.ts);
                    if (prices[prices.length - 1].ts.getTime() !== normalizedPriceTime.getTime()) {
                        BotRunner._tsc.append(key, PriceEntity.fromRow(price));
                    }
                }

                ctx.prices = prices;

                const indicators = await instance.computeIndicatorsForTick(ctx, price);
                const signal = await instance.computeSignal(ctx, price, indicators);

                //const stateBeforeTick = (instanceRecord.stateJson as any).fsmState;
                const tickState = await instance.tick(ctx, price, signal, indicators);
                //const newState = tickState.fsmState;
                //const stateAfterTick = (instanceRecord.stateJson as any).fsmState;

                if (tickState !== null && instanceRecord.stateJson !== undefined) {
                    instanceRecord.stateJson = tickState;
                }

                instanceRecord.prevTick = new Date();
                await strats.updateBotInstance(instanceRecord, trx);
            }
        }
        catch (err) {
            log.error(`Error ticking bot ${botIdentifier(instanceRecord)}`, err);
        }
        finally {
            if (profile) {
                console.profileEnd();
            }

            const duration = Date.now() - start;

            // TODO: Move this magic value to live settings
            if (duration > 100) {
                log.debug(`Tick ${botIdentifier(instanceRecord)} in ${duration}ms`);
            }
        }
    }

    /**
     * Computes signals and indicators for a backtest without executing any ordering logic.
     * @param args 
     * @returns 
     */
    async calculateIndicatorsAndSignals(args: BacktestRequest): Promise<IndicatorsAndSignals> {
        let { budget, name, from, genome: genomeStr, to } = args;

        const signals = [];
        const indicators = {};
        let prices = [];
        try {
            const { genome } = new GenomeParser().parse(args.genome);

            const ctx = await buildBotContextForSignalsComputation(args);
            const botType = genome.getGene<string>("META", "IMPL").value;
            const localInstance = botFactory.create(botType) as BotImplementation;


            // HACK: FIX default date issue on "to" where it defaults to Nov 15
            if (ctx.instance.modeId === "test-forward") {
                from = new Date();
            }

            // Grab the prices + a run-in window of N prices before trading begins.
            // This is to support indicators with moving windows
            const intervalMs = millisecondsPerResInterval(args.res);
            const maxIntervals = genome.getGene<number>(names.GENETICS_C_TIME, names.GENETICS_C_TIME_G_MAX_INTERVALS).value;
            const actualFrom = new Date(from.getTime() - (intervalMs * maxIntervals));

            const params: PriceDataParameters = {
                exchange: env.PRIMO_DEFAULT_EXCHANGE,
                res: args.res,
                symbolPair: args.symbols,
                fetchDelay: 1000,
                fillMissing: true,
                from: actualFrom,
                to: new Date(to.getTime()),
            };

            const beginLoadPrices = Date.now();
            let sus: SymbolResultSet = null;
            await measure("calculateIndicatorsAndSignals::prices", async () => {
                sus = await sym.getSymbolPriceData(params);
            });

            const { missingRanges, prices: pricesWithLeadin, warnings } = sus;


            // DEBUG: Verifing from exchange
            /*
            const [rawData, rawPrices] = await sym.fetchPriceDataFromExchange(params);

            const primoData = pricesWithLeadin.slice(maxIntervals);
            const exData = rawPrices.slice(maxIntervals);

            const primoTimestamps = primoData.map(p => p.ts);
            const exTimestamp = exData.map(p => p.ts);
            const primoCloses = primoData.map(p => p.close + "");
            const exCloses = exData.map(p => p.close + "");

            const primoLows = primoData.map(p => p.low + "");
            const exLow = exData.map(p => p.low + "");
            
            debugger;
            */
            // DEBUG //

            // We need to use the lead-in prices to calculate indicators with sliding windows, e.g. RSI
            ctx.prices = pricesWithLeadin;
            const endLoadPrices = Date.now();
            const loadPricesDuration = endLoadPrices - beginLoadPrices;


            // IMPORTANT: We are ticking at the interval level here (e.g. 1min) and not necessarily at true tick-level (e.g. 1s)
            const window = maxIntervals;

            // Initialize 
            const newState = await localInstance.initialize(ctx);
            if (newState) {
                ctx.state = newState;
            }
            else {
                ctx.state = {} as any;
            }

            ctx.instance.runState = RunState.ACTIVE;
            ctx.instance.modeId = BotMode.BACK_TEST;

            for (let i = 1; i < (pricesWithLeadin.length - window) + 1; ++i) {
                ctx.prices = pricesWithLeadin.slice(i, i + window);
                const tick = ctx.prices[ctx.prices.length - 1];
                if (this.isGapTick(tick)) {
                    continue;
                }

                const botIndicators = await localInstance.computeIndicatorsForTick(ctx, tick);
                const signal = await localInstance.computeSignal(ctx, tick, botIndicators);

                // Store the indicators and current signal

                signals.push(signal);

                for (const ind of botIndicators.keys()) {
                    let cators = indicators[ind];
                    if (!cators) {
                        cators = indicators[ind] = [];
                    }

                    const indicatorValue = botIndicators.get(ind);
                    if (Array.isArray(indicatorValue)) {
                        cators.push(indicatorValue[indicatorValue.length - 1]);
                    }
                    else {
                        cators.push(indicatorValue);
                    }
                }
            }

            // Omit leadin prices from the returned prices
            prices = pricesWithLeadin.slice(window);

            const result: IndicatorsAndSignals = {
                signals,
                indicators,
                prices,
            }

            return result;
        }
        catch (err) {
            throw err;
        }
    }

    /**
     * Runs a backtest, producing a summary report of the bots performance.
     * @param args 
     * @param ctx 
     * @returns 
     */
    async run(args: BacktestRequest, ctx: BotContext = null): Promise<ApiBacktestHandle | BotRunReport> {
        const start = Date.now();
        const trx = null;//await db.transaction();
        let { budget, name, from, genome: genomeStr, /*maxWagerPct,*/ res, to } = args;

        // TODO: Fix this...JSONification
        if (typeof from === "string") {
            from = DateTime.fromISO(from as string).toJSDate();
        }
        if (typeof to === "string") {
            to = DateTime.fromISO(to as string).toJSDate();
        }

        const tr: Partial<BotRunReport> = {
        };

        let instanceId: string = null;
        let run: BotRun = null;
        let capitalInvested = Money("0");
        const { genome } = new GenomeParser().parse(genomeStr);
        const symbols = sym.parseSymbolPair(args.symbols);
        const [base, quote] = symbols;
        const defDisplayName = `Backtest for '${name}'`;
        const normalizedGenome = ""; // TODO

        const defProps: Partial<BotDefinition> = {
            displayName: defDisplayName,
            description: defDisplayName,
            symbols: args.symbols,
            genome: genomeStr,
            name,
        };


        // Note: Properties here being assigned in specific order for presentaiton
        tr.instanceId = "";
        tr.runId = "";
        tr.name = ""
        tr.symbols = args.symbols;
        tr.base = base;
        tr.quote = quote;
        tr.genome = genomeStr;
        tr.from = from;
        tr.to = to;
        tr.finish = null;
        tr.length = "";
        tr.timeRes = null;
        tr.numCandles = 0;
        tr.firstOpen = null;
        tr.firstClose = null;
        tr.lastClose = null;
        tr.capital = capitalInvested;
        tr.balance = null;
        tr.totalGross = null;
        tr.totalGrossPct = 0;
        tr.totalFees = Money("0");
        tr.totalProfit = Money("0");
        tr.totalProfitPct = 0;
        tr.buyAndHoldGrossPct = 0;
        tr.avgProfitPerDay = Money("0");
        tr.avgProfitPctPerDay = 0;
        tr.estProfitPerYearCompounded = Money("0");
        tr.numOrders = 0;
        tr.numTrades = 0;
        tr.totalWins = 0;
        tr.totalLosses = 0;

        tr.avgWinRate = 0;
        tr.sharpe = 0;
        tr.sortino = 0;
        tr.durationMs = 0;
        tr.error = null;
        tr.missingRanges = [];
        tr.trailingOrder = null;
        tr.indicators = {};
        //tr.signals = [];
        tr.orders = [];

        const instanceProps: Partial<BotInstance> = {
            build: version.full,
            name,
            normalizedGenome: genomeStr,
            resId: res,
        };

        const appliedDefProps = Object.assign({}, DEFAULT_NEW_BOT_DEF_PROPS, defProps);
        const appliedInstanceProps = Object.assign({}, DEFAULT_NEW_BOT_INSTANCE_PROPS, instanceProps);

        /*
        if (appliedDefProps.normalizedGenome) {
            delete appliedDefProps.normalizedGenome; // TODO
        }*/
        if (!appliedInstanceProps.normalizedGenome) {
            //appliedInstanceProps.normalizedGenome = appliedInstanceProps.currentGenome;
        }
        if (!appliedInstanceProps.resId) {
            appliedInstanceProps.resId = genome.getGene<TimeResolution>(genes.META_TR).value;
        }

        appliedInstanceProps.modeId = BotMode.BACK_TEST;

        const user = await users.getSystemUser();
        const workspace = await strats.getDefaultWorkspaceForUser(user.id, user.id, trx);
        const strat = await strats.getOrCreateDefaultStrategy(workspace.id, user.id, trx);
        const existing = await strats.getBotDefinitionByName(workspace.id, name, trx);
        if (existing) {
            throw new Error(`Bot definition with name '${name}' already exists`);
        }

        const workspaceId = workspace.id;

        appliedDefProps.workspaceId = workspaceId;
        appliedDefProps.genome = genomeStr;


        const [budgetItem] = budget;
        const allocStr = `${budgetItem.quantity} ${budgetItem.symbol.id}`;

        const ledger = await capital.createAllocationForBot(strat.id, allocStr, {}, trx);
        const { alloc, items } = ledger;

        // Note: Only 1 item per allocation currently supported.
        capitalInvested = items[0].amount.mul(items[0].maxWagerPct.toString());
        tr.capital = capitalInvested;

        const def = await strats.addNewBotDefinition(strat.id, appliedDefProps, trx);
        const instanceRecord = await strats.createNewInstanceFromDef(def, appliedInstanceProps.resId, name, alloc.id, false, trx);
        const [, backtestRun] = await strats.startBotInstance({ id: instanceRecord.id }, trx);
        let allPrices: Price[] = [];

        const maxIntervals = genome.getGene<number>(names.GENETICS_C_TIME, names.GENETICS_C_TIME_G_MAX_INTERVALS).value;
        tr.window = maxIntervals;

        const runPromise: Promise<BotRunReport> = new Promise(async (res, rej) => {
            try {
                run = backtestRun;
                tr.instanceId = instanceRecord.id;
                tr.runId = run.id;
                tr.name = instanceRecord.name;

                instanceId = instanceRecord.id;
                tr.timeRes = instanceRecord.resId;

                if (!ctx) {
                    ctx = await buildBacktestingContext(def, instanceRecord, run);
                }

                const symbolPair = instanceRecord.symbols;
                const botType = genome.getGene<string>("META", "IMPL").value;
                const res = instanceRecord.resId;
                const localInstance = botFactory.create(botType) as BotImplementation;

                // Initialize 
                log.info(`Initializing backtest for bot ${botIdentifier(instanceRecord)}`);

                const newState = await localInstance.initialize(ctx);
                ctx.state = instanceRecord.stateJson = newState;

                instanceRecord.runState = RunState.ACTIVE;
                instanceRecord.modeId = BotMode.BACK_TEST;
                instanceRecord.prevTick = new Date();

                // SAVE
                await strats.updateBotInstance(instanceRecord);
                const now = Date.now();
                const intervalMs = millisecondsPerResInterval(res);

                // Grab the prices + a run-in window of N prices before trading begins.
                // This is to support indicators with moving windows
                const actualFrom = new Date(from.getTime() - (intervalMs * maxIntervals));

                const params: PriceDataParameters = {
                    exchange: env.PRIMO_DEFAULT_EXCHANGE,
                    res,
                    symbolPair,
                    fetchDelay: 1000,
                    fillMissing: true,
                    from: actualFrom,
                    to: new Date(to.getTime()),
                };

                run.from = from;
                run.to = params.to;

                await strats.updateBotRun(run, trx);

                // TODO: Consider price pull from API in the case of a gap?
                //  Think about a deployment rollout
                const beginLoadPrices = Date.now();

                // Testing only
                // Use Redis to avoid pulling multiple times, i.e. during tests.
                const useCache = false;//env.isTest();
                let sus: SymbolResultSet = null;
                if (!env.isTest() || !useCache) {
                    sus = await sym.getSymbolPriceData(params);
                }
                else {
                    const cacheKey = `${params.exchange}-${params.res}-${params.symbolPair}-${params.from.toISOString()}-${params.to.toISOString()}`;

                    // Use 59 seconds 
                    const raw = await cache.getObject(cacheKey, 59, async () => {
                        return sym.getSymbolPriceData(params);
                    });

                    const p = raw.prices.map(r => PriceEntity.fromRow(r));
                    sus = {
                        ...raw,
                        prices: p,
                    };
                }

                const { missingRanges, prices, warnings } = sus;

                ctx.prices = prices;
                allPrices = prices;
                const endLoadPrices = Date.now();
                const loadPricesDuration = endLoadPrices - beginLoadPrices;

                // TODO: PERF
                tr.numCandles = allPrices.length - maxIntervals;
                tr.missingRanges = missingRanges;

                // TODO: update prices earlier; perf metrics


                // NOTE: We are ticking at the interval level here (e.g. 1min) and not necessarily at true tick-level (e.g. 1s)

                for (let i = 1; i < (prices.length - maxIntervals) + 1; ++i) {
                    ctx.prices = prices.slice(i, i + maxIntervals);
                    const tick = ctx.prices[ctx.prices.length - 1];
                    if (this.isGapTick(tick)) {
                        continue;
                    }

                    const indicators = await localInstance.computeIndicatorsForTick(ctx, tick);
                    const signal = await localInstance.computeSignal(ctx, tick, indicators);
                    const newState = await localInstance.tick(ctx, tick, signal, indicators);

                    if (newState !== null && instanceRecord.stateJson !== undefined) {
                        instanceRecord.stateJson = newState;
                    }

                    localInstance.changeFsmState(ctx, ctx.state, newState.fsmState);
                    instanceRecord.prevTick = new Date();
                }

                // Save the final bot state for inspection
                await strats.updateBotInstance(instanceRecord);

                if (instanceId) {
                    await strats.stopBotInstance(instanceId, null, trx);
                }

                return tr as BotRunReport;
            }
            catch (err) {
                log.error(`Error running backtest for '${name}'`, err);
                tr.error = err;

                if (trx) {
                    await trx.rollback();
                }

                if (instanceId) {
                    await strats.stopBotInstance(instanceId, err);
                }

                throw err;
            }
            finally {
                let orders: Order[] = [];
                if (run) {
                    orders = ctx.backtestingOrders as Order[];
                }

                // Extract trade pairs
                const pairs = new Map<Order, Order>();
                const ordersById = new Map<string, Order>();
                const buys = orders.filter(o => o.typeId === (OrderType.LIMIT_BUY || o.typeId === OrderType.MARKET_BUY) && !o.relatedOrderId)
                buys.forEach(buy => {
                    pairs.set(buy, null);
                    ordersById.set(buy.id, buy);
                });

                // Note: Not using typeId here due to a temporary bug where all orders are marked as buys
                const sells = orders.filter(o => !isNullOrUndefined(o.relatedOrderId));
                sells.forEach(sell => {
                    const buyForSell = ordersById.get(sell.relatedOrderId);
                    pairs.set(buyForSell, sell);
                });

                // TODO: Review... this should go away and the ending drawdown should be used.
                // Disregard the last order if it's an open buy
                if (orders.length > 0 && orders[orders.length - 1].typeId === OrderType.LIMIT_BUY && !orders[orders.length - 1].relatedOrderId) {
                    const [trailingOrder] = orders.splice(orders.length - 1);
                    tr.trailingOrder = trailingOrder;
                }

                tr.orders = orders;

                const firstOpen = allPrices.length > 0 ? allPrices[maxIntervals].open : Money("0");
                const firstClose = allPrices.length > 0 ? allPrices[maxIntervals].close : Money("0");
                const lastClose = allPrices.length > 0 ? allPrices[allPrices.length - 1].close : Money("0");

                tr.firstOpen = firstOpen;
                tr.firstClose = firstClose;
                tr.lastClose = lastClose;

                // Compute the trading results based on the orders and our report so far
                const tradingResults = await results.computeTradingResults(instanceRecord, pairs, tr);

                // Mixin computed results
                Object.assign(tr, tradingResults);

                const finish = Date.now();
                const duration = finish - start;
                tr.durationMs = duration;
                tr.finish = new Date(finish);
                log.info(`Done testing '${name}' in ${duration}ms`);

                try {
                    await results.addResultsForBotRun(tr.runId, tr as BotRunReport);
                }
                catch (err) {
                    log.error(`An error occurred while saving test results`, err);
                }
                res(tr as BotRunReport);
            }
        });

        if (args.returnEarly) {
            const er: ApiBacktestHandle = {
                id: instanceRecord.id,
                name,
            };

            runPromise.catch(err => log.error(`Error dispatching async backtest`, err));
            return er;
        }
        else {
            const results = await runPromise;
            return results;
        }
    }

    /**
     * Runs a simple heuristic check to detect if a tick is part of a gap.
     * NOTE: Really, really rough...
     * @param tick 
     * @returns 
     */
    isGapTick(tick: Price) {
        if (tick.open.toNumber() === 0 ||
            tick.low.toNumber() === 0 ||
            tick.close.toNumber() == 0) {
            console.log(`Skip gap @ ${tick.ts.toISOString()}`);
            return true;
        }

        return false;
    }
}
