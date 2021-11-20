import Koa from "koa";
import { DateTime } from "luxon";
import { Body, Get, Post, Query, Request, Route } from "tsoa";
import env from "../../common-backend/env";
import { ApiBacktestRequest, ApiBotOrderDescriptor } from "../../common/messages";
import { BacktestRequest } from "../../common-backend/messages/testing";
import { BotRunner } from "../../common-backend/bots/BotRunner";
import { ControllerBase } from "./ControllerBase";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { capital, db, orders, results, strats, sym } from "../../common-backend/includes";
import { isNullOrUndefined } from "../../common/utils";
import { randomName } from "../../common-backend/utils/names";
import { DEFAULT_BACKTEST_BUDGET_AMOUNT } from "../../common-backend/commands/bots/test";


@Route("tests")
export class BacktestController extends ControllerBase {


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
}
