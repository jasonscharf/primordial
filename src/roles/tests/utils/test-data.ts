import { TradeSymbol, TradeSymbolType } from "../../common/models/markets/TradeSymbol";
import { Price } from "../../common/models/system/Price";
import { sym } from "../../common-backend/includes";
import env from "../../common-backend/env";
import { Money } from "../../common/numbers";


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
        volume: 1,
    };

    return Object.assign({}, dummyPriceProps, props);
}

export async function getTestData() {
    if (_testDataCtx) {
        return _testDataCtx;
    }

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

    const testSymbol1 = await sym.addSymbol(symbolProps1);
    const testSymbol2 = await sym.addSymbol(symbolProps2);

    _testDataCtx = {
        testSymbol1,
        testSymbol2,
    };

    return _testDataCtx;
}

let _testDataCtx: TestDataCtx = null;
