import Koa from "koa";
import { DateTime } from "luxon";
import env from "../../../common-backend/env";
import { ControllerBase } from "../ControllerBase";
import { Get, Query, Request, Route } from "tsoa";
import { BacktestRequest } from "../../../common-backend/messages/testing";
import { BotRunner } from "../../../common-backend/bots/BotRunner";
import { BotRunReport } from "../../../common/models/bots/BotSummaryResults";
import { BuildInfo, EnvInfo, InfoResponse } from "../../../common/api";
import { Money } from "../../../common/numbers";
import { SymbolResultSet } from "../../../common/models/system/SymbolResultSet";
import { TimeResolution } from "../../../common/models/markets/TimeResolution";
import { version } from "../../../common/version";
import { capital, orders, results, strats, sym } from "../../../common-backend/includes";
import { millisecondsPerResInterval } from "../../../common/utils/time";
import { PriceDataParameters } from "../../../common/models/system/PriceDataParameters";
import { moneytize } from "../../../common-backend/database/utils";
import { us } from "../../../common-backend/includes";
import { BotInstance } from "../../../common/models/bots/BotInstance";


@Route("sandbox")
export class Sandbox extends ControllerBase {

    @Get("/results/{instanceIdOrName}")
    async getBotResults(instanceIdOrName: string): Promise<any> {

        // NOTE: Actually returns a BotSummaryResults, but the type doesn't play nice with TSOA/Swagger

        const user = this.currentSession?.user || null;

        let instance: BotInstance = null;

        try {
            instance = await strats.getBotInstanceById(instanceIdOrName);
        }
        catch (err) {

        }
        if (!instance) {
            const { id } = await us.getSystemUser();
            const workspace = await strats.getDefaultWorkspaceForUser(id, id);
            instance = await strats.getBotInstanceByName(workspace.id, instanceIdOrName);
            instanceIdOrName = instance.id;
        }
        const run = await strats.getLatestRunForInstance(instanceIdOrName);

        if (!run) {
            throw new Error(`Bot hasn't run yet`);
        }

        const report = await results.getLatestResultsForBot(instanceIdOrName);

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

        const sus = <SymbolResultSet>await this.getPrices(args.symbols, instance.resId, run.from.toISOString(), run.to.toISOString());
        const { missingRanges, prices, warnings } = sus;
        const { signals, indicators } = await runner.calculateIndicatorsAndSignals(args);
        return {
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
