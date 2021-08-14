import { DateTime } from "luxon";
import env from "../../common-backend/env";
import { Money } from "../../common/numbers";
import { Price } from "../../common/models/system/Price";
import { PriceDataRange } from "../../common-backend/services/SymbolService";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { TradeSymbol, TradeSymbolType } from "../../common/models/markets/TradeSymbol";
import { assert } from "../includes";
import { db, sym } from "../../common-backend/includes";
import { from, millisecondsPerResInterval, normalizePriceTime } from "../../common-backend/utils/time";


export interface TestDataCtx {
    testSymbol1: TradeSymbol;
    testSymbol2: TradeSymbol;
}


export function createTestPrice(props?: Partial<Price>) {
    const dummyPriceProps: Partial<Price> = {
        exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
        baseSymbolId: "BTC",
        quoteSymbolId: "USD",
        resId: "1m",
        ts: new Date(),
        open: Money("0"),
        low: Money("0"),
        high: Money("0"),
        close: Money("0"),
        volume: Money("1"),
    };

    return Object.assign({}, dummyPriceProps, props);
}

export async function getTestData() {

    // We're dealing a fresh test DB, so we need to add our own currencies for testing
    const symbolProps1: Partial<TradeSymbol> = {
        typeId: TradeSymbolType.CRYPTO,
        id: "BTC",
        sign: "B",
        displayUnits: 8,
    };

    const symbolProps2: Partial<TradeSymbol> = {
        typeId: TradeSymbolType.CRYPTO,
        id: "USD",
        sign: "U",
        displayUnits: 8,
    };

    const symbol1 = await sym.getSymbol(symbolProps1.id);
    const symbol2 = await sym.getSymbol(symbolProps2.id);

    const testSymbol1 = symbol1 || await sym.addSymbol(symbolProps1);
    const testSymbol2 = symbol2 || await sym.addSymbol(symbolProps2);

    return {
        testSymbol1,
        testSymbol2,
    };
}



export interface TestPriceGenerator {
    (start: Date, end: Date, res: TimeResolution, curr: Date): Partial<Price>;
}


// Note: Money type not used here - number good enough for testing, in this context.
export const sineGenerator: TestPriceGenerator = (start: Date, end: Date, res: TimeResolution, ts: Date) => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    const pct = (ts.getTime() - startMs) / (endMs - startMs);

    // TODO: Complete this stub...

    const s = Math.sin(pct);
    const open = 0;
    const close = s;
    const low = 0;
    const high = s;

    const price = createTestPrice({
        resId: "1m",
        ts: new Date(),
        open: Money(open.toString()),
        low: Money(low.toString()),
        high: Money(high.toString()),
        close: Money(close.toString()),
        volume: Money("1"),
    });

    return price;
}


/**
 * Fills a range with data for the given time resolution.
 * @param exchange 
 * @param pair 
 * @param res 
 * @param start 
 * @param generator Optional OHLCV price generating function
 * @param end 
 */
export async function fillRangeWithData(exchange: string, pair: string, res: TimeResolution, start: Date, end = new Date(), generator: TestPriceGenerator = null) {
    const prices = await generateTestPrices(exchange, pair, res, start, end, generator);
    return sym.addPriceData(exchange, res, prices);
}

/**
 * Generates mock price data suitable for saving into the DB for testing.
 * @param exchange 
 * @param pair 
 * @param res 
 * @param start 
 * @param end 
 * @param generator 
 * @returns 
 */
export async function generateTestPrices(exchange: string, pair: string, res: TimeResolution, start: Date, end = new Date(), generator: TestPriceGenerator = null) {
    const [base, quote] = sym.parseSymbolPair(pair);
    const baseProps = createTestPrice({
        exchangeId: exchange,
        baseSymbolId: base,
        quoteSymbolId: quote,
        resId: "1m",
        ts: normalizePriceTime(res, start),
        open: Money("0"),
        low: Money("0"),
        high: Money("100"),
        close: Money("100"),
        volume: Money("1"),
    });

    const prices: Partial<Price>[] = [];
    let dt = normalizePriceTime(res, start);
    while (dt < end) {
        const { open, low, high, close, volume } = generator
            ? generator(start, end, res, dt)
            : { open: Money("0"), low: Money("0"), high: Money("100"), close: Money("100"), volume: 50 }
            ;

        const p = Object.assign({}, baseProps, {
            ts: new Date(dt),
            open,
            low,
            high,
            close,
            volume,
        });

        dt = new Date(dt.getTime() + millisecondsPerResInterval(res) + 1);
        prices.push(p);
    }

    return prices;
}

export async function fill(start = from("2010-01-01T00:00:00"), end = from("2010-01-01T23:59:59:999"), generator?: TestPriceGenerator) {
    return fillRangeWithData(env.PRIMO_DEFAULT_EXCHANGE, "BTC/USD", TimeResolution.ONE_MINUTE, start, end);
}


export async function getMissingRanges(start = from("2010-01-01T00:00:00"), end = from("2010-01-01T23:59:59:999"), res = TimeResolution.ONE_MINUTE): Promise<PriceDataRange[]> {
    return sym.getMissingRanges(env.PRIMO_DEFAULT_EXCHANGE, "BTC/USD", res, start, end);
}
