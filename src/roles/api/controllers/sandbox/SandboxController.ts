import Koa from "koa";
import { DateTime } from "luxon";
import { Body, Get, Post, Query, Request, Route } from "tsoa";
import env from "../../../common-backend/env";
import { ApiBacktestRequest, ApiBotOrderDescriptor } from "../../../common/messages";
import { BotInstance } from "../../../common/models/bots/BotInstance";
import { BacktestRequest } from "../../../common-backend/messages/testing";
import { BotMode } from "../../../common/models/system/Strategy";
import { BotRunner } from "../../../common-backend/bots/BotRunner";
import { ControllerBase } from "../ControllerBase";
import { PriceDataParameters } from "../../../common/models/system/PriceDataParameters";
import { PrimoSerializableError } from "../../../common/errors/errors";
import { RunState } from "../../../common/models/system/RunState";
import { SymbolResultSet } from "../../../common/models/system/SymbolResultSet";
import { TimeResolution } from "../../../common/models/markets/TimeResolution";
import { capital, orders, results, strats, sym } from "../../../common-backend/includes";
import { isNullOrUndefined } from "../../../common/utils";
import { millisecondsPerResInterval } from "../../../common/utils/time";
import { randomName } from "../../../common-backend/utils/names";
import { us } from "../../../common-backend/includes";
import { DEFAULT_BACKTEST_BUDGET_AMOUNT } from "../../../common-backend/commands/bots/test";


@Route("sandbox")
export class SandboxController extends ControllerBase {


    @Post("/run")
    async runBacktest(@Body() req: ApiBacktestRequest): Promise<any> {
        const { from, genome, maxWagerPct, name, returnEarly, symbols, to } = req;
        const [base, quote] = sym.parseSymbolPair(symbols);
        const defaultBudget = `${DEFAULT_BACKTEST_BUDGET_AMOUNT} ${quote}`;
        const fromParsed = from ? DateTime.fromISO(from).toJSDate() : null;
        const toParsed = to ? DateTime.fromISO(to).toJSDate() : null;

        const budget = `10000 ${quote}`;
        const budgetParsed = await capital.parseAssetAmounts(budget || defaultBudget);

        const res = req.res as TimeResolution;

        // TODO: Validation

        const args: BacktestRequest = {
            genome: req.genome,
            budget: budgetParsed,
            maxWagerPct,
            name: isNullOrUndefined(name) ? randomName() : name,
            res,
            symbols: symbols.toUpperCase(),
            remove: false,
            from: fromParsed,
            to: toParsed,
            returnEarly,
        };

        const runner = new BotRunner();
        const results = await runner.run(args);

        return results;
    }

    @Get("/results/status/{instanceIdOrName}")
    async getBotResultsStatus(instanceIdOrName: string): Promise<{ runState: RunState }> {
        // ... const user = this.currentSession?.user || null;
        let instance: BotInstance = null;

        try {
            instance = await strats.getBotInstanceById(instanceIdOrName);
        }
        catch (err) {
            // The suppression of error here is because we accept we are searching
            // IDs or names, and the "get by ID" operation fails (by design)
            // TODO: Improve the catch here.
        }

        if (!instance) {
            const { id } = await us.getSystemUser();
            const workspace = await strats.getDefaultWorkspaceForUser(id, id);
            instance = await strats.getBotInstanceByName(workspace.id, instanceIdOrName);
            instanceIdOrName = instance.id;
        }

        if (instance.modeId === BotMode.BACK_TEST && instance.runState === RunState.ACTIVE) {
            return {
                runState: RunState.ACTIVE,
            };
        }
        else {
            return {
                runState: instance.runState,
            }
        }
    }

    @Get("/results/{instanceIdOrName}")
    async getBotResults(instanceIdOrName: string): Promise<any> {

        // NOTE: Actually returns a BotSummaryResults, but the type doesn't play nice with TSOA/Swagger

        const user = this.currentSession?.user || null;
        let instance: BotInstance = null;

        try {
            instance = await strats.getBotInstanceById(instanceIdOrName);
        }
        catch (err) {
            // The suppression of error here is because we accept we are searching
            // IDs or names, and the "get by ID" operation fails (by design)
            // TODO: Improve the catch here.
        }

        if (!instance) {
            const { id } = await us.getSystemUser();
            const workspace = await strats.getDefaultWorkspaceForUser(id, id);
            instance = await strats.getBotInstanceByName(workspace.id, instanceIdOrName);
            instanceIdOrName = instance.id;
        }

        const allocationId = instance.allocationId;
        const run = await strats.getLatestRunForInstance(instanceIdOrName);
        if (!run) {
            throw new Error(`Bot hasn't run yet`);
        }

        const report = await results.getLatestResultsForBot(instanceIdOrName);
        if (!report) {
            throw new PrimoSerializableError(`Could not find bot results for '${instanceIdOrName}'`, 404);
        }

        // Compute indicators and signals for the run
        const runner = new BotRunner();
        const args: BacktestRequest = {
            from: run.from,
            to: run.to,
            genome: instance.currentGenome,
            budget: [],
            maxWagerPct: 0,
            name: instance.name,
            remove: true,
            res: instance.resId,
            symbols: instance.symbols,
        };

        const srs = <SymbolResultSet>await this.getPrices(args.symbols, instance.resId, run.from.toISOString(), run.to.toISOString());
        const { missingRanges, prices, warnings } = srs;
        const { signals, indicators } = await runner.calculateIndicatorsAndSignals(args);
        return {
            instance,
            report,
            prices,
            signals,
            indicators,
        };
    }

    @Get("/prices/{symbolPair}")
    async getPrices(symbolPair: string, @Query() res?: string, @Query() from?: string, @Query() to?: string): Promise<any> {
        const user = this.currentSession?.user || null;

        const resParsed = res ? res as TimeResolution : TimeResolution.FIFTEEN_MINUTES;
        const fromParsed = from ? DateTime.fromISO(from).toJSDate() : new Date(Date.now() - (millisecondsPerResInterval(TimeResolution.ONE_DAY) * 7));
        const toParsed = to ? DateTime.fromISO(to).toJSDate() : new Date();

        const [base, quote] = sym.parseSymbolPair(symbolPair);
        const symbolPairCleaned = base + "/" + quote;

        const params: PriceDataParameters = {
            exchange: env.PRIMO_DEFAULT_EXCHANGE,
            res: resParsed,
            symbolPair: symbolPairCleaned,
            fetchDelay: 1000,
            fillMissing: true,
            from: fromParsed,
            to: toParsed,
        };

        const beginLoadPrices = Date.now();
        const sus = await sym.getSymbolPriceData(params);
        const { missingRanges, prices, warnings } = sus;

        return sus;
    }
}
