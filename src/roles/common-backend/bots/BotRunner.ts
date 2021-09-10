import { DateTime } from "luxon";
import knex from "knex";
//import PA from "portfolio-analytics";
import env from "../env";
import { BotResultsSummary } from "./BotSummaryResults";
import { BacktestRequest } from "../messages/testing";
import { BotContext, botIdentifier, buildBotContext } from "./BotContext";
import { BotDefinition } from "../../common/models/bots/BotDefinition";
import { BotRun } from "../../common/models/bots/BotRun";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotImplementation } from "./BotImplementation";
import { GenomeParser } from "../genetics/GenomeParser";
import { Mode } from "../../common/models/system/Strategy";
import { Money } from "../../common/numbers";
import { Order, OrderState, OrderType } from "../../common/models/markets/Order";
import { OrderEntity } from "../../common/entities/OrderEntity";
import { PriceDataParameters } from "../services/SymbolService";
import { RunState } from "../../common/models/system/RunState";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { randomString } from "../../common/utils";
import { capital, db, log, strats, users } from "../includes";
import { human, millisecondsPerResInterval, normalizePriceTime } from "../utils/time";
import { botFactory } from "../../worker/bots/RobotFactory";
import { query } from "../database/utils";
import { sym } from "../services";
import { tables } from "../constants";
import { version } from "../../common/version";



export const TEST_DEFAULT_NEW_BOT_DEF_PROPS: Partial<BotDefinition> = {
};

export const TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS: Partial<BotInstance> = {
    runState: RunState.NEW,
    modeId: Mode.BACK_TEST,
    exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
};


/**
 * Handles running of bots in backtest mode.
 */
export class BotRunner {

    async run(args: BacktestRequest, ctx: BotContext = null): Promise<BotResultsSummary> {
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

        const results: Partial<BotResultsSummary> = {
        };

        let instanceId: string = null;
        let run: BotRun = null;
        let capitalInvested = Money("0");
        try {
            const { genome } = new GenomeParser().parse(genomeStr);
            const symbols = sym.parseSymbolPair(args.symbols);
            const defDisplayName = `Backtest for '${name}'`;
            const normalizedGenome = ""; // TODO

            const defProps: Partial<BotDefinition> = {
                displayName: defDisplayName,
                description: defDisplayName,
                symbols: args.symbols,
                name,
                normalizedGenome: genomeStr,
            };

            // Note: Properties here being assigned in specific order for presentaiton
            results.instanceId = "";
            results.name = ""
            results.symbols = args.symbols;
            results.genome = genomeStr;
            results.from = from;
            results.to = to;
            results.finish = null;
            results.length = "";
            results.numCandles = 0;
            results.firstClose = null;
            results.lastClose = null;
            results.capital = capitalInvested;
            results.balance = null;
            results.totalGross = Money("0");
            results.totalGrossPct = 0;
            results.buyAndHoldGrossPct = 0;
            results.avgProfitPerDay = 0;
            results.avgProfitPctPerDay = 0;
            results.numOrders = 0;
            results.numTrades = 0;
            results.totalWins = 0;
            results.totalLosses = 0;

            results.avgWinRate = 0;
            results.sharpe = 0;
            results.sortino = 0;
            results.durationMs = 0;
            results.error = null;
            results.missingRanges = [];
            results.trailingOrder = null;
            results.orders = [];

            const instanceProps: Partial<BotInstance> = {
                build: version.full,
                name,
                normalizedGenome: genomeStr,
            };

            const appliedDefProps = Object.assign({}, TEST_DEFAULT_NEW_BOT_DEF_PROPS, defProps);
            const appliedInstanceProps = Object.assign({}, TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS, instanceProps);

            if (appliedDefProps.normalizedGenome) {
                delete appliedDefProps.normalizedGenome; // TODO
            }
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
            run = backtestRun;
            results.instanceId = instanceRecord.id;
            results.name = instanceRecord.name;

            instanceId = instanceRecord.id;
            results.timeRes = instanceRecord.resId;

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
            const start = end - (intervalMs * maxHistoricals);

            // Update price history. Note: This is *definitely* a case for optimization.
            // Let's grab the previous N for now, until some sort of caching/progressive solution
            // can be executed cross-node (b/c bots run on multiple machines)
            const params: PriceDataParameters = {
                exchange: env.PRIMO_DEFAULT_EXCHANGE,
                res,
                symbolPair,
                fetchDelay: 1000,
                fillMissing: true,
                from: from,
                to: new Date(to.getTime() - 1),
            };

            // TODO: Consider price pull from API in the case of a gap?
            //  Think about a deployment rollout
            const beginLoadPrices = Date.now();

            const sus = await sym.getSymbolPriceData(params);
            const { missingRanges, prices, warnings } = sus;

            ctx.prices = prices;
            const endLoadPrices = Date.now();
            const loadPricesDuration = endLoadPrices - beginLoadPrices;

            // TODO: PERF

            results.numCandles = prices.length;
            results.missingRanges = missingRanges;

            // TODO: update prices earlier; perf metrics


            // IMPORTANT: We are ticking at the interval level here (e.g. 1min) and not necessarily at true tick-level (e.g. 1s)

            const window = genome.getGene<number>("TIME", "MI").value;

            for (let i = 0; i < prices.length - window; ++i) {
                ctx.prices = prices.slice(i, i + window);
                let price = ctx.prices[ctx.prices.length - 1];
                const indicators = await localInstance.computeIndicatorsForTick(ctx, price);
                const newState = await localInstance.tick(ctx, price, indicators);

                if (newState !== null && instanceRecord.stateJson !== undefined) {
                    ctx.state = instanceRecord.stateJson = newState;
                }

                instanceRecord.prevTick = new Date();

                //log.info(`Backtest in state ${newState.fsmState}`);

                // SAVE (maybe?)
                //await strats.updateBotInstance(instanceRecord);
            }

            if (instanceId) {
                await strats.stopBotInstance(instanceId, null, trx);
            }
            return results as BotResultsSummary;
        }
        catch (err) {
            log.error(`Error running backtest for '${name}'`, err);
            results.error = err;

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
                results.trailingOrder = trailingOrder;
            }
            const firstClose = ctx.prices[0].close;
            const lastClose = ctx.prices[ctx.prices.length - 1].close;

            let totalGrossProfit = Money("0");
            orders.forEach(o => totalGrossProfit = totalGrossProfit.add(o.gross));
            results.totalGross = totalGrossProfit;
            results.capital = capitalInvested;
            results.firstClose = firstClose;
            results.lastClose = lastClose;
            results.totalGrossPct = (results.totalGross.div(capitalInvested).round(4).toNumber());
            results.buyAndHoldGrossPct = lastClose.div(firstClose).minus("1").round(3).toNumber();
            results.balance = capitalInvested.plus(totalGrossProfit);
            results.orders = orders;``
            results.numOrders = orders.length;
            results.numTrades = results.numOrders / 2;
            const testLenMs = results.to.getTime() - results.from.getTime();
            const days = Math.ceil(testLenMs / millisecondsPerResInterval(TimeResolution.ONE_DAY));
            results.avgProfitPerDay = totalGrossProfit.div(days + "").round(2).toNumber();
            results.avgProfitPctPerDay = parseFloat(Math.round(results.totalGrossPct / days).toPrecision(3));
            results.length = human(testLenMs);


            const finish = Date.now();
            const duration = finish - start;
            results.durationMs = duration;
            results.finish = new Date(finish);
            log.info(`Done testing '${name}' in ${duration}ms`);
            return results as BotResultsSummary;
        }
    }
}
