import { TradeSymbol, TradeSymbolType } from "../../common/models/markets/TradeSymbol";
import { sym } from "../../common-backend/includes";


export interface TestDataCtx {
    testSymbol1: TradeSymbol;
    testSymbol2: TradeSymbol;
}


export async function getTestData() {
    if (_testDataCtx) {
        return _testDataCtx;
    }

    // We're dealing a fresh test DB, so we need to add our own currencies for testing
    const symbolProps1: Partial<TradeSymbol> = {
        typeId: TradeSymbolType.CRYPTO,
        id: "MOOSECOIN",
        sign: "M",
        displayUnits: 8,
    };

    const symbolProps2: Partial<TradeSymbol> = {
        typeId: TradeSymbolType.CRYPTO,
        id: "DOGECOIN",
        sign: "D",
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
