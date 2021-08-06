import "intern";
import Knex from "knex";
import { Money, sleep } from "../../common/utils";
import { SymbolService } from "../../common-backend/services/SymbolService";
import { TestDataCtx, getTestData, createTestPrice } from "../utils/test-data";
import { Price } from "../../common/models/system/Price";
import { TradeSymbol, TradeSymbolType } from "../../common/models/markets/TradeSymbol";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { assert, describe, before, env, it } from "../includes";
import { db, us } from "../../common-backend/includes";
import { assertRejects } from "../utils/async";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { normalizePriceTime } from "../../common/utils/time";


describe(SymbolService.name, () => {
    let ctx: TestDataCtx = null;
    let sym: SymbolService = new SymbolService();

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(async () => sym = new SymbolService());

    describe(sym.addSymbol.name, () => {
        it("throws if the symbol already exists", async () => {
            const symbolProps: Partial<TradeSymbol> = {
                typeId: TradeSymbolType.CRYPTO,
                id: "BEAVERCOIN",
                sign: "BEAV",
                displayUnits: 1,
            };

            await sym.addSymbol(symbolProps);
            await assertRejects(() => sym.addSymbol(symbolProps));
        });

        it("correctly represents monetary values with 8 decimal points of precision", async () => {

            // SHIBA INU has 12 decimal spots :/
            const precisePriceStr = "0.000000000001";

            const dummyPriceProps: Partial<Price> = {
                exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
                baseSymbolId: ctx.testSymbol1.id,
                quoteSymbolId: ctx.testSymbol1.id,
                resId: "1m",
                ts: new Date(),
                open: Money(precisePriceStr),
                low: Money(precisePriceStr),
                high: Money(precisePriceStr),
                close: Money(precisePriceStr),
                volume: 1,
            };

            const newPrice = await sym.addSymbolPrice(dummyPriceProps);

            assert.equal(newPrice.open.toString(), precisePriceStr);
            assert.equal(newPrice.low.toString(), precisePriceStr);
            assert.equal(newPrice.high.toString(), precisePriceStr);
            assert.equal(newPrice.close.toString(), precisePriceStr);
            assert.instanceOf(newPrice.open, Money);
            assert.instanceOf(newPrice.low, Money);
            assert.instanceOf(newPrice.high, Money);
            assert.instanceOf(newPrice.close, Money);
        });

        it("correctly represents monetary values into the hundreds of billions", async () => {
            const precisePriceStr = "999999999.000000000001";

            const dummyPriceProps = createTestPrice({
                exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
                baseSymbolId: ctx.testSymbol1.id,
                quoteSymbolId: ctx.testSymbol1.id,
                resId: "1m",
                ts: new Date(),
                open: Money(precisePriceStr),
                low: Money(precisePriceStr),
                high: Money(precisePriceStr),
                close: Money(precisePriceStr),
                volume: 1,
            });

            const newPrice = await sym.addSymbolPrice(dummyPriceProps);
            assert.equal(newPrice.close.toString(), precisePriceStr);
        });
    });

    describe(sym.addSymbolPrice.name, () => {
        it("throws if the base or quote symbols do not exist", async () => {
            const priceProps = createTestPrice({
                resId: TimeResolution.ONE_MINUTE,
                baseSymbolId: "NONEXISTENT1",
                quoteSymbolId: "NONEXISTENT2",
                ts: normalizePriceTime(TimeResolution.ONE_MINUTE, new Date()),
            });

            await assertRejects(() => sym.addSymbolPrice(priceProps));
        });

        it("throws when adding a price for the same minute", async () => {
            const { testSymbol1, testSymbol2 } = ctx;

            const ts1 = new Date();
            const ts2 = new Date();

            const priceProps1 = createTestPrice({
                resId: TimeResolution.ONE_MINUTE,
                baseSymbolId: "BTC",
                quoteSymbolId: "USD",
                ts: ts1,
            });

            const priceProps2 = Object.assign({}, priceProps1, { ts: ts2 });

            await sym.addSymbolPrice(priceProps1);
            await assertRejects(() => sym.addSymbolPrice(priceProps2));
        });

        // ... TODO: other time resolutions
    });

    describe(sym.getPrices.name, () => {

        it("matches exchange prices when using TSDB bucketing", async () => {
            // TODO: Ensure 5min data rolled up from TSDB matches 5min data from Binance
        });
    });

    describe(sym.pullSymbolPrices.name, () => {
        it("adds unknown symbols to the DB", async () => {

        });
    });


    describe(sym.getKnownSymbolNames.name, () => {
        it("returns known symbols", async () => {
        });
    });

    describe(sym.updateGlobalSymbolPrices.name, () => {
        it("updates symbol prices for a market", async () => {

        });
    });

    describe(sym.deriveTradeSymbolFromCCXT.name, () => {
        it("derives a proper `TradeSymbol` from a CCXT market def", async () => {
            // ...
        });
    });

    /*
    describe(sym.loadMarkets.name, () => {
        it("loads some markets", async () => {
            throw new Error('Not implemented');
        });

        it("stores market definitions in the cache", async () => {
            throw new Error('Not implemented');
        });

        it("updates the DB", async () => {
            throw new Error('Not implemented');
        });
    });*/
});
