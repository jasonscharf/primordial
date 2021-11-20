import Koa from "koa";
import { DateTime } from "luxon";
import { Body, Get, Post, Query, Request, Route } from "tsoa";
import env from "../../common-backend/env";
import { ControllerBase } from "./ControllerBase";
import { PriceDataParameters } from "../../common/models/system/PriceDataParameters";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { millisecondsPerResInterval } from "../../common/utils/time";
import { sym } from "../../common-backend/services";


@Route("prices")
export class PriceController extends ControllerBase {

    @Get("/query/{symbolPair}")
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
