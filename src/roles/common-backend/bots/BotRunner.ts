import { DateTime } from "luxon";
import knex from "knex";
import env from "../env";
import { ApiBacktestHandle } from "../../common/messages/trading";
import { BacktestRequest } from "../messages/testing";
import { BotContext, botIdentifier, buildBotContext, buildBotContextForSignalsComputation } from "./BotContext";
import { BotDefinition } from "../../common/models/bots/BotDefinition";
import { BotRun } from "../../common/models/bots/BotRun";
import { BotRunReport } from "../../common/models/bots/BotSummaryResults";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotImplementation } from "./BotImplementation";
import { GenomeParser } from "../genetics/GenomeParser";
import { Mode } from "../../common/models/system/Strategy";
import { Money } from "../../common/numbers";
import { Order, OrderState, OrderType } from "../../common/models/markets/Order";
import { OrderEntity } from "../../common/entities/OrderEntity";
import { Price } from "../../common/models/markets/Price";
import { PriceDataParameters } from "../../common/models/system/PriceDataParameters";
import { PriceEntity } from "../../common/entities/PriceEntity";
import { PriceUpdateMessage } from "../messages/trading";
import { RunState } from "../../common/models/system/RunState";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { TimeSeriesCache, TimeSeriesCacheArgs } from "../system/TimeSeriesCache";
import { botFactory } from "./RobotFactory";
import { capital, db, log, results, strats, users } from "../includes";
import { human, millisecondsPerResInterval, normalizePriceTime } from "../../common/utils/time";
import { names } from "../genetics/base-genetics";
import { query } from "../database/utils";
import { sym } from "../services";
import { tables } from "../constants";
import { version } from "../../common/version";
import { sleep } from "../utils";



export const TEST_DEFAULT_NEW_BOT_DEF_PROPS: Partial<BotDefinition> = {
};

export const TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS: Partial<BotInstance> = {
    runState: RunState.NEW,
    modeId: Mode.BACK_TEST,
    exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
};


export interface IndicatorsAndSignals {
    signals: number[];
    indicators: Map<string, number[]>;
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
    async tickBot(def: BotDefinition, instanceRecord: BotInstance, price: PriceUpdateMessage) {
        const start = Date.now();
        const run: BotRun = await strats.getLatestRunForInstance(instanceRecord.id);
        const ctx = await buildBotContext(def, instanceRecord, run);

        // TODO: Extract to BotRunner facility

        const { genome } = ctx;
        const symbolPair = instanceRecord.symbols;
        const botType = genome.getGene<string>("META", "IMPL").value;
        const res = genome.getGene<TimeResolution>("TIME", "RES").value;
        const instance = botFactory.create(botType) as BotImplementation;


        // Initialize new bots in a transaction to ensure we don't initialize it multiple times
        if (instanceRecord.runState === RunState.INITIALIZING) {
            let trx = await db.transaction();
            try {
                log.info(`Initializing ${botIdentifier(instanceRecord)}`);

                const newState = await instance.initialize(ctx);

                if (newState) {
                    instanceRecord.stateJson = newState;
                }

                instanceRecord.runState = RunState.ACTIVE;
                instanceRecord.prevTick = new Date();

                await strats.updateBotInstance(instanceRecord, trx);
                await trx.commit();
            }
            catch (err) {
                log.error(`Error initializing ${botIdentifier(instanceRecord)}. Rolling back...`, err);

                instanceRecord.runState = RunState.ERROR;
                await trx.rollback();
                await strats.updateBotInstance(instanceRecord);
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
            const tickState = await instance.tick(ctx, price, signal, indicators);

            if (tickState !== null && instanceRecord.stateJson !== undefined) {
                instanceRecord.stateJson = tickState;
            }

            instanceRecord.prevTick = new Date();
            //log.debug(`Updating ${botIdentifier(instanceRecord)} in the DB...`);

            await strats.updateBotInstance(instanceRecord);
        }

        const duration = Date.now() - start;
        //log.debug(`Done ticking ${botIdentifier(instanceRecord)} in ${duration}ms`);
    }

    /**
     * Computes signals and indicators for a backtest without executing any ordering logic.
     * @param args 
     * @returns 
     */
    async calculateIndicatorsAndSignals(args: BacktestRequest): Promise<IndicatorsAndSignals> {
        let { budget, name, from, genome: genomeStr, /*maxWagerPct,*/ to } = args;

        const signals = [];
        const indicators = new Map<string, number[]>();
        try {
            const { genome } = new GenomeParser().parse(args.genome);

            const ctx = await buildBotContextForSignalsComputation(args);
            const botType = genome.getGene<string>("META", "IMPL").value;
            const localInstance = botFactory.create(botType) as BotImplementation;


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
                to: new Date(to.getTime() - 1),
            };

            const beginLoadPrices = Date.now();

            const sus = await sym.getSymbolPriceData(params);
            const { missingRanges, prices, warnings } = sus;

            ctx.prices = prices;
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
                ctx.state = {};
            }

            ctx.instance.runState = RunState.ACTIVE;
            ctx.instance.modeId = Mode.BACK_TEST;

            for (let i = 0; i < prices.length - window; ++i) {
                ctx.prices = prices.slice(i, i + window);
                const tick = ctx.prices[ctx.prices.length - 1];
                if (this.isGapTick(tick)) {
                    continue;
                }

                const botIndicators = await localInstance.computeIndicatorsForTick(ctx, tick);
                const signal = await localInstance.computeSignal(ctx, tick, botIndicators);
                const newState = await localInstance.tick(ctx, tick, signal, botIndicators);

                if (newState !== null && ctx.instance.stateJson !== undefined) {
                    ctx.state = ctx.instance.stateJson = newState;
                }

                ctx.instance.prevTick = new Date();

                // Store the indicators and current signal
                signals.push(signal);

                for (const ind of botIndicators.keys()) {
                    let cators = indicators[ind];
                    if (!cators) {
                        cators = indicators[ind] = [];
                    }

                    const foo = botIndicators.get(ind);
                    if (foo && Array.isArray(foo)) {
                        cators.push(foo[foo.length - 1]);
                    }
                    else {
                        cators.push(null);
                    }
                }

                //log.info(`Backtest in state ${newState.fsmState}`);

                // SAVE (maybe?)
                //await strats.updateBotInstance(instanceRecord);
            }


            const result: IndicatorsAndSignals = {
                signals,
                indicators,
            }

            return result;
        }
        catch (err) {
            throw err;
        }

        return {
            signals,
            indicators,
        };
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
        let { budget, name, from, genome: genomeStr, /*maxWagerPct,*/ to } = args;

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
        tr.firstClose = null;
        tr.lastClose = null;
        tr.capital = capitalInvested.round(12).toNumber();
        tr.balance = null;
        tr.totalGross = null;
        tr.totalGrossPct = 0;
        tr.buyAndHoldGrossPct = 0;
        tr.avgProfitPerDay = 0;
        tr.avgProfitPctPerDay = 0;
        tr.estProfitPerYearCompounded = 0;
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
        };

        const appliedDefProps = Object.assign({}, TEST_DEFAULT_NEW_BOT_DEF_PROPS, defProps);
        const appliedInstanceProps = Object.assign({}, TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS, instanceProps);

        /*
        if (appliedDefProps.normalizedGenome) {
            delete appliedDefProps.normalizedGenome; // TODO
        }*/
        if (!appliedInstanceProps.normalizedGenome) {
            //appliedInstanceProps.normalizedGenome = appliedInstanceProps.currentGenome;
        }
        if (!appliedInstanceProps.resId) {
            appliedInstanceProps.resId = genome.getGene<TimeResolution>("TIME", "RES").value;
        }

        appliedInstanceProps.modeId = Mode.BACK_TEST;

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

        capitalInvested = items[0].amount.mul(items[0].maxWagerPct.toString());

        const def = await strats.addNewBotDefinition(strat.id, appliedDefProps, trx);
        const instanceRecord = await strats.createNewInstanceFromDef(def, appliedInstanceProps.resId, name, alloc.id, false, trx);
        const [, backtestRun] = await strats.startBotInstance({ id: instanceRecord.id }, trx);

        const runPromise: Promise<BotRunReport> = new Promise(async (res, rej) => {
            try {
                run = backtestRun;
                tr.instanceId = instanceRecord.id;
                tr.runId = run.id;
                tr.name = instanceRecord.name;

                instanceId = instanceRecord.id;
                tr.timeRes = instanceRecord.resId;

                // TODO: Contextually correct context (i.e. save records or no)
                if (!ctx) {
                    ctx = await buildBotContext(def, instanceRecord, run);
                }

                const symbolPair = instanceRecord.symbols;
                const botType = genome.getGene<string>("META", "IMPL").value;
                const res = genome.getGene<TimeResolution>("TIME", "RES").value;
                const localInstance = botFactory.create(botType) as BotImplementation;

                // Initialize 
                log.info(`Initializing backtest for bot ${botIdentifier(instanceRecord)}`);

                const newState = await localInstance.initialize(ctx);
                if (newState) {
                    instanceRecord.stateJson = newState;
                }

                instanceRecord.runState = RunState.ACTIVE;
                instanceRecord.modeId = Mode.BACK_TEST;
                instanceRecord.prevTick = new Date();

                // SAVE
                await strats.updateBotInstance(instanceRecord);

                const maxHistoricals = genome.getGene<number>("TIME", "MI").value;
                const now = Date.now();
                const end = normalizePriceTime(res, new Date(now)).getTime();
                const intervalMs = millisecondsPerResInterval(res);

                // Grab the prices + a run-in window of N prices before trading begins.
                // This is to support indicators with moving windows
                const maxIntervals = genome.getGene<number>(names.GENETICS_C_TIME, names.GENETICS_C_TIME_G_MAX_INTERVALS).value;
                tr.window = maxIntervals;

                const actualFrom = new Date(from.getTime() - (intervalMs * maxIntervals));

                const params: PriceDataParameters = {
                    exchange: env.PRIMO_DEFAULT_EXCHANGE,
                    res,
                    symbolPair,
                    fetchDelay: 1000,
                    fillMissing: true,
                    from: actualFrom,
                    to: new Date(to.getTime() - 1),
                };

                run.from = params.from;
                run.to = params.to;

                await strats.updateBotRun(run, trx);

                // TODO: Consider price pull from API in the case of a gap?
                //  Think about a deployment rollout
                const beginLoadPrices = Date.now();

                const sus = await sym.getSymbolPriceData(params);
                const { missingRanges, prices, warnings } = sus;

                ctx.prices = prices;
                const endLoadPrices = Date.now();
                const loadPricesDuration = endLoadPrices - beginLoadPrices;

                // TODO: PERF
                tr.numCandles = prices.length;
                tr.missingRanges = missingRanges;

                // TODO: update prices earlier; perf metrics


                // IMPORTANT: We are ticking at the interval level here (e.g. 1min) and not necessarily at true tick-level (e.g. 1s)


                for (let i = 0; i < prices.length - maxIntervals; ++i) {
                    ctx.prices = prices.slice(i, i + maxIntervals);
                    const tick = ctx.prices[ctx.prices.length - 1];
                    if (this.isGapTick(tick)) {
                        continue;
                    }
                    const indicators = await localInstance.computeIndicatorsForTick(ctx, tick);
                    const signal = await localInstance.computeSignal(ctx, tick, indicators);
                    const newState = await localInstance.tick(ctx, tick, signal, indicators);

                    if (newState !== null && instanceRecord.stateJson !== undefined) {
                        ctx.state = instanceRecord.stateJson = newState;
                    }

                    instanceRecord.prevTick = new Date();

                    // Store the indicators and current signal
                    //tr.signals.push(signal);

                    //log.info(`Backtest in state ${newState.fsmState}`);

                    // SAVE (maybe?)
                    //await strats.updateBotInstance(instanceRecord);
                }

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
                    orders = await query("orders", async db => {
                        const rows = <Order[]>await db(tables.Orders)
                            .where({ botRunId: run.id })
                            .orderBy("opened");

                        return rows.map(row => OrderEntity.fromRow(row));
                    });
                }

                // Disregard the last buy
                if (orders.length > 0 && orders[orders.length - 1].typeId === OrderType.LIMIT_BUY) {
                    const [trailingOrder] = orders.splice(orders.length - 1);
                    tr.trailingOrder = trailingOrder;
                }
                const firstClose = ctx.prices.length > 0 ? ctx.prices[0].close : Money("0");
                const lastClose = ctx.prices.length > 0 ? ctx.prices[ctx.prices.length - 1].close : Money("0");

                let totalGrossProfit = Money("0");
                orders.forEach(o => totalGrossProfit = totalGrossProfit.add(o.gross));
                tr.totalGross = totalGrossProfit.round(12).toNumber();
                tr.capital = capitalInvested.round(12).toNumber();
                tr.firstClose = firstClose.round(12).toNumber();
                tr.lastClose = lastClose.round(12).toNumber();
                tr.totalGrossPct = (totalGrossProfit.div(capitalInvested).round(4).toNumber());
                tr.buyAndHoldGrossPct = lastClose.div(firstClose).minus("1").round(3).toNumber();
                tr.balance = capitalInvested.plus(totalGrossProfit).round(12).toNumber();
                tr.orders = orders;
                tr.numOrders = orders.length;
                tr.numTrades = tr.numOrders / 2;
                const testLenMs = tr.to.getTime() - tr.from.getTime();
                const days = Math.ceil(testLenMs / millisecondsPerResInterval(TimeResolution.ONE_DAY));
                tr.avgProfitPerDay = totalGrossProfit.div(days + "").round(2).toNumber();
                tr.avgProfitPctPerDay = parseFloat((tr.totalGrossPct / days).toPrecision(3));
                tr.length = human(testLenMs);

                // Compounded is calculated per week here.
                const rate = tr.avgProfitPctPerDay * 365;
                const periods = 52;
                const roundTo = /USD/.test(quote) ? 2 : 4;
                tr.estProfitPerYearCompounded = orders.length < 2
                    ? 0
                    : capital.calcCompoundingInterest(capitalInvested, rate, periods, 1).sub(capitalInvested).round(roundTo).toNumber()
                    ;

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
     * @param tick 
     * @returns 
     */
    isGapTick(tick: Price) {
        if (tick.volume.toNumber() == 0 &&
            tick.open.toNumber() == 0 &&
            tick.close.toNumber() == 0) {
            console.log(`Skip gap @ ${tick.ts.toISOString()}`);
            return true;
        }

        return false;
    }
}
