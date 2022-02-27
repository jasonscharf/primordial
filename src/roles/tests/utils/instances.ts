import { Knex } from "knex";
import { v4 as uuid } from "uuid";
import { AddTestInstanceArgs } from "./types";
import { AllocationLedger } from "../../common-backend/services/CapitalService";
import { BigNum, num } from "../../common/numbers";
import { BotMode } from "../../common/models/system/Strategy";
import { BotResults } from "../../common/models/bots/BotResults";
import { BotRunReport } from "../../common/models/bots/BotSummaryResults";
import { BotType } from "../../common/models/bots/BotType";
import { Order, OrderType } from "../../common/models/markets/Order";
import { RunState } from "../../common/models/system/RunState";
import { assert, env } from "../includes";
import { capital, db, orders, results, strats, sym, users } from "../../common-backend/includes";
import { isNullOrUndefined } from "../../common/utils";
import { randomName } from "../../common-backend/utils/names";
import {
    TEST_DEFAULT_ADD_TEST_INSTANCE_ARGS,
    TEST_DEFAULT_NEW_BOT_DEF_PROPS,
    TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS,
    TEST_DEFAULT_ORDER_CAPITAL
} from "../constants";
import { makeTestOrder } from "./ordering";
import { first } from "@react-financial-charts/core";
import { BotRun } from "../../common/models/bots/BotRun";


/**
 * This is the primary method of creating and launching instances in tests.
 * By default, creates a new, uninitialized forward-test instance.
 * @param args 
 * @param defProps 
 * @param instanceProps 
 * @param trx 
 * @returns 
 */
export async function addTestInstance(args = TEST_DEFAULT_ADD_TEST_INSTANCE_ARGS, defProps = TEST_DEFAULT_NEW_BOT_DEF_PROPS, instanceProps = TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS, trx: Knex.Transaction = null) {
    trx = trx || await db.transaction();
    try {

        // Apply arg overlays
        const appliedArgs = Object.assign({}, TEST_DEFAULT_ADD_TEST_INSTANCE_ARGS, args);
        const appliedDefProps = Object.assign({}, TEST_DEFAULT_NEW_BOT_DEF_PROPS, defProps);
        const appliedInstanceProps = Object.assign({}, TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS, instanceProps);

        let { orders: ordersFromProps, ruid, runFrom, runTo, stop } = appliedArgs;

        ruid = ruid || (await users.getSystemUser()).id;
        if (!appliedArgs.ruid) {
            appliedArgs.ruid = ruid;
        }


        const name = randomName();
        if (!appliedDefProps.name) {
            appliedDefProps.name = appliedDefProps.displayName = name;
        }
        if (!appliedInstanceProps.name) {
            appliedInstanceProps.name = appliedInstanceProps.displayName = name;
        }
        if (!appliedInstanceProps.normalizedGenome) {
            appliedInstanceProps.normalizedGenome = appliedInstanceProps.currentGenome;
        }

        // Use the mode from the method args if specified
        if (!isNullOrUndefined(args.modeId)) {
            appliedInstanceProps.modeId = args.modeId;
        }

        // Use the runstate from the method args if specified
        if (!isNullOrUndefined(args.runState)) {
            appliedInstanceProps.runState = args.runState;
        }

        // Setup workspace/strategy
        const workspace = await strats.getDefaultWorkspaceForUser(ruid, ruid, trx);
        const strat = await strats.getOrCreateDefaultStrategy(workspace.id, ruid, trx);
        const existing = await strats.getBotDefinitionByName(workspace.id, name, trx);

        const workspaceId = workspace.id;

        if (!appliedDefProps.workspaceId) {
            appliedDefProps.workspaceId = workspaceId;
        }

        // Pluck from applied arguments
        let { budget, existingAllocationId, start } = appliedArgs;
        let modeId = appliedInstanceProps.modeId;

        if (!isNullOrUndefined(budget) && !isNullOrUndefined(existingAllocationId)) {
            throw new Error(`Budget and existing allocation ID specified. Choose one or the other.`);
        }


        // Setup bot ledger (for FWD tests)
        let ledger: AllocationLedger = null;

        if (isNullOrUndefined(existingAllocationId)) {
            ledger = await capital.createAllocationForBot(strat.id, budget, null, trx);
        }
        else {
            ledger = await capital.getAllocationLedger(existingAllocationId, trx);
        }

        // Create instance and ledger
        const { alloc } = ledger;
        const def = await strats.addNewBotDefinition(strat.id, appliedDefProps, trx);
        let instance = await strats.createNewInstanceFromDef(def, appliedInstanceProps.resId, name, alloc.id, false, trx);

        // Mixin specific props
        delete appliedInstanceProps.exchangeId;
        delete appliedInstanceProps.normalizedGenome;
        const update = Object.assign(instance, appliedInstanceProps);
        instance = await strats.updateBotInstance(instance, trx);

        const { state: argsTestState } = appliedArgs;
        const { stateJson } = instance;

        // Fake prev / latest price state members, since this test bot may not have ticked
        if (args.state) {
            Object.assign(stateJson, args.state);
        }
        const isBacktest = appliedInstanceProps.modeId === BotMode.BACK_TEST;

        // Set state variables such as "prevPrice" and "latestPrice"
        // TODO: Break out to a new initialization helper. All new bots should have valid stateJson.
        // State may not have been set yet (we are dealing with new instances)
        const { orders: fakeOrders } = appliedArgs;
        if (fakeOrders && fakeOrders.length > 0) {

            // ... asumes fakeOrders sorted
            const firstOrder = fakeOrders[0];
            const lastOrder = fakeOrders[fakeOrders.length - 1];
            stateJson.firstPrice = firstOrder.price;
            stateJson.latestPrice = (lastOrder ?? firstOrder).price;

            // prevPrice represents the previous buy price
            if (lastOrder && lastOrder.typeId === OrderType.LIMIT_BUY) {
                stateJson.prevPrice = lastOrder.price;
            }
        }

        // Overlay and save any specific test state
        if (argsTestState) {
            Object.assign(instance.stateJson, argsTestState);
            instance = await strats.updateBotInstance(instance, trx);
        }

        if (start) {
            [instance] = await strats.startBotInstance({ id: instance.id }, trx);
        }

        let run = await strats.getLatestRunForInstance(instance.id, trx);
        const [base, quote] = sym.parseSymbolPair(instance.symbols);


        // Build test orders
        let syntheticOrders = makeTestOrdersForBotRun(run, ordersFromProps);

        // Prepare run report
        let report: Partial<BotRunReport> = null;

        // Note: For fwd test instances, test orders are actually saved and loaded back from the DB.
        if (!isBacktest) {
            if (syntheticOrders.length > 0) {
                let savedOrders: Partial<Order>[] = [];
                for (const order of syntheticOrders) {
                    const savedOrder = await orders.addOrderToDatabase(order, trx);
                    savedOrders.push(savedOrder);
                }

                syntheticOrders = savedOrders;
            }
        }

        report = results.createEmptyRunReport();
        report.from = runFrom;
        report.to = runTo;
        report.orders = syntheticOrders as Order[] ?? [];
        report.firstClose = stateJson.firstPrice ?? BigNum("1");
        report.lastClose = stateJson.latestPrice ?? BigNum("1");
        report.symbols = instance.symbols;

        if (run) {
            report.runId = run.id;
        }

        // If we have a run, add a results record to the DB
        if (run && isBacktest) {
            report = await results.addResultsForBotRun(run.id, report as BotRunReport, trx);
        }

        // Set the correct test props on the run
        if (run) {
            run.from = runFrom;
            run.to = runTo;
            run = await strats.updateBotRun(run, trx);
        }

        if (stop) {
            const [stoppedInstance] = await strats.stopBotInstance(instance.id, null, trx);
            instance = stoppedInstance;
        }

        const syntheticTrades = results.mapTradePairs(syntheticOrders as Order[]);
        const tradingResults = await results.computeTradingResults(instance, syntheticTrades, report);
        Object.assign(report, tradingResults);

        await trx.commit();

        return {
            def,
            instance,
            run,
            orders: syntheticOrders,
            trades: syntheticTrades,
            report,
        };
    }
    catch (err) {
        await trx.rollback();
        throw err;
    }
}


export function makeTestOrdersForBotRun(run: Partial<BotRun>, orders: Partial<Order>[]) {
    if (!orders || orders.length < 1) {
        return [];
    }
    else if (orders.length > 0 && !run) {
        throw new Error(`Must have a run to use synthetic orders`);
    }

    const mappedOrders = orders.map(props => makeTestOrder(Object.assign({}, { botRunId: run.id }, props)));

    // Map sells to buys.
    // NOTE: Assumes buy/sell/buy ordering (except for trailing buy order)
    let prevBuy: Partial<Order> = null;
    for (const order of mappedOrders) {
        order.id = uuid();
        order.botRunId = run.id;
        if (order.typeId == OrderType.LIMIT_BUY) {
            prevBuy = order;
        }
        else if (order.typeId == OrderType.LIMIT_SELL) {
            order.relatedOrderId = prevBuy.id;
            prevBuy = null;
        }
    }

    return mappedOrders;
}
