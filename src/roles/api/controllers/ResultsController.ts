import Koa from "koa";
import { DateTime } from "luxon";
import { Body, Get, Post, Query, Request, Route } from "tsoa";
import env from "../../common-backend/env";
import { ApiBacktestRequest, ApiBotOrderDescriptor } from "../../common/messages";
import { BacktestRequest } from "../../common-backend/messages/testing";
import { BotRunReport } from "../../common/models/bots/BotSummaryResults";
import { BotMode } from "../../common/models/system/Strategy";
import { BotRunner } from "../../common-backend/bots/BotRunner";
import { ControllerBase } from "./ControllerBase";
import { Order, OrderType } from "../../common/models/markets/Order";
import { PrimoSerializableError } from "../../common/errors/errors";
import { RunState } from "../../common/models/system/RunState";
import { botIdentifier } from "../../common-backend/bots/BotContext";
import { capital, db, orders, results, strats, sym } from "../../common-backend/includes";
import { isNullOrUndefined } from "../../common/utils";
import { us } from "../../common-backend/includes";
import { query } from "../../common-backend/database/utils";
import { tables } from "../../common-backend/constants";


@Route("results")
export class ResultsController extends ControllerBase {

    @Get("/status/{instanceName}")
    async getBotResultsStatus(instanceName: string): Promise<{ runState: RunState }> {
        // ... const user = this.currentSession?.user || null;

        const { id: ruid } = await us.getSystemUser();
        const workspace = await strats.getDefaultWorkspaceForUser(ruid, ruid);
        const instance = await strats.getBotInstanceByName(workspace.id, instanceName);

        // Note: Overloading RunState here. Active == not ready. Stopped == ready
        if (instance.modeId === BotMode.BACK_TEST && instance.runState === RunState.ACTIVE) {
            return {
                runState: RunState.ACTIVE,
            };
        }
        else {
            return {
                runState: RunState.STOPPED,
            }
        }
    }

    @Get("/report/{instanceName}")
    async getBotResults(instanceName: string): Promise<any> {

        // NOTE: Actually returns a BotSummaryResults, but the type doesn't play nice with TSOA/Swagger

        const user = this.currentSession?.user || null;
        const { id: ruid } = await us.getSystemUser();
        const workspace = await strats.getDefaultWorkspaceForUser(ruid, ruid);

        // SECURITY: Need RUID here
        const instance = await strats.getBotInstanceByName(workspace.id, instanceName);
        const instanceId = instance.id;
        const allocationId = instance.allocationId;

        const run = await strats.getLatestRunForInstance(instanceId);
        if (!run) {
            throw new Error(`Bot hasn't run yet`);
        }

        let report: BotRunReport;

        // Fetch results for a running bot, or get saved results for a backtest
        if (instance.modeId !== BotMode.BACK_TEST) {
            report = await results.getLatestResultsForRunningBot(ruid, instanceId);
        }
        else {
            report = await results.getLatestBacktestResultsForInstance(instanceId);

            if (!report) {
                throw new Error(`Could not find results for bot ${botIdentifier(instance)}`);
            }

            // HACK: Re-compute trading results using the current build.
            // This keeps results records up-to-date with the latest fixes and logic.
            const backtestOrders = report.orders;
            const pairs = new Map<Order, Order>();
            const ordersById = new Map<string, Order>();
            const buys = backtestOrders.filter(o => o.typeId === (OrderType.LIMIT_BUY || o.typeId === OrderType.MARKET_BUY) && !o.relatedOrderId)
            buys.forEach(buy => {
                pairs.set(buy, null);
                ordersById.set(buy.id, buy);
            });

            // NOTE: Not using typeId here due to a temporary bug where all orders are marked as buys
            const sells = backtestOrders.filter(o => !isNullOrUndefined(o.relatedOrderId));
            sells.forEach(sell => {
                const buyForSell = ordersById.get(sell.relatedOrderId);
                pairs.set(buyForSell, sell);
            });

            const supplementals = await results.computeTradingResults(instance, pairs, report);
            Object.assign(report, supplementals);

            const run = await strats.getLatestRunForInstance(instance.id);
            await query("fixup.results", async db => {
                return db(tables.Results)
                    .where({ botRunId: run.id })
                    .update({ results: report })
                    ;
            });
        }

        if (!report) {
            throw new PrimoSerializableError(`Could not find bot results for '${instanceName}'`, 404);
        }

        // For fwd/live instances, run up to the latest tick (update)
        const to = instance.modeId === BotMode.BACK_TEST ? run.to : instance.updated;

        // Compute indicators and signals for the run
        const runner = new BotRunner();
        const args: BacktestRequest = {
            from: run.from,
            to,
            genome: instance.currentGenome,
            budget: [],
            maxWagerPct: 0,
            name: instance.name,
            remove: true,
            res: instance.resId,
            symbols: instance.symbols,
        };

        const { signals, indicators, prices } = await runner.calculateIndicatorsAndSignals(args);
        return {
            instance,
            report,
            prices,
            signals,
            indicators,
        };
    }
}
