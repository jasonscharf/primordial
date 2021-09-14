import { DateTime } from "luxon";
import knex from "knex";
//import PA from "portfolio-analytics";
import env from "../env";
import { BacktestRequest } from "../messages/testing";
import { BotContext, botIdentifier, buildBotContext } from "./BotContext";
import { BotDefinition } from "../../common/models/bots/BotDefinition";
import { BotResultsSummary } from "../../common/models/bots/BotSummaryResults";
import { BotRun } from "../../common/models/bots/BotRun";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotImplementation } from "./BotImplementation";
import { GenomeParser } from "../genetics/GenomeParser";
import { Mode } from "../../common/models/system/Strategy";
import { Money } from "../../common/numbers";
import { Order, OrderState, OrderType } from "../../common/models/markets/Order";
import { OrderEntity } from "../../common/entities/OrderEntity";
import { PriceDataParameters } from "../../common/models/system/PriceDataParameters";
import { RunState } from "../../common/models/system/RunState";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { randomString } from "../../common/utils";
import { capital, db, log, results, strats, users } from "../includes";
import { human, millisecondsPerResInterval, normalizePriceTime } from "../../common/utils/time";
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

    /**
     * Runs a backtest, producing a summary report of the bots performance.
     * @param args 
     * @param ctx 
     * @returns 
     */
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

        const tr: Partial<BotResultsSummary> = {
        };

        let instanceId: string = null;
        let run: BotRun = null;
        let capitalInvested = Money("0");
        try {
            const { genome } = new GenomeParser().parse(genomeStr);
            const symbols = sym.parseSymbolPair(args.symbols);
            const [base, quote] = symbols;
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
            tr.orders = [];

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

            tr.numCandles = prices.length;
            tr.missingRanges = missingRanges;

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
            return tr as BotResultsSummary;
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
            const firstClose = ctx.prices[0].close;
            const lastClose = ctx.prices[ctx.prices.length - 1].close;

            let totalGrossProfit = Money("0");
            orders.forEach(o => totalGrossProfit = totalGrossProfit.add(o.gross));
            tr.totalGross = totalGrossProfit.round(12).toNumber();
            tr.capital = capitalInvested.round(12).toNumber();
            tr.firstClose = firstClose.round(12).toNumber();
            tr.lastClose = lastClose.round(12).toNumber();
            tr.totalGrossPct = (totalGrossProfit.div(capitalInvested).round(4).toNumber());
            tr.buyAndHoldGrossPct = lastClose.div(firstClose).minus("1").round(3).toNumber();
            tr.balance = capitalInvested.plus(totalGrossProfit).round(12).toNumber();
            tr.orders = orders;``
            tr.numOrders = orders.length;
            tr.numTrades = tr.numOrders / 2;
            const testLenMs = tr.to.getTime() - tr.from.getTime();
            const days = Math.ceil(testLenMs / millisecondsPerResInterval(TimeResolution.ONE_DAY));
            tr.avgProfitPerDay = totalGrossProfit.div(days + "").round(2).toNumber();
            tr.avgProfitPctPerDay = parseFloat(Math.round(tr.totalGrossPct / days).toPrecision(3));
            tr.length = human(testLenMs);

            // Compounded is calculated per day here.
            const rate = tr.avgProfitPctPerDay;
            tr.estProfitPerYearCompounded = capital.calcCompoundingInterest(capitalInvested, rate, 365, 1).round(12).toNumber();

            const finish = Date.now();
            const duration = finish - start;
            tr.durationMs = duration;
            tr.finish = new Date(finish);
            log.info(`Done testing '${name}' in ${duration}ms`);

            try {
                await results.addResultsForBotRun(tr.runId, tr as BotResultsSummary);
            }
            catch (err) {
                log.error(`An error occurred while saving test results`, err);
            }
            return tr as BotResultsSummary;
        }
    }
}
