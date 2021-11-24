import "intern";
import { DateTime } from "luxon";
import Knex from "knex";
import { Money, sleep } from "../../common/utils";
import { Price } from "../../common/models/markets/Price";
import { PriceDataParameters } from "../../common/models/system/PriceDataParameters";
import { SymbolService, PriceDataRange, DEFAULT_PRICE_DATA_PARAMETERS } from "../../common-backend/services/SymbolService";
import { TestDataCtx, getTestData, createTestPrice, fillRangeWithData, sineGenerator, fill, getMissingRanges, generateTestPrices, increasingPriceGenerator } from "../utils/test-data";
import { TradeSymbol, TradeSymbolType } from "../../common/models/markets/TradeSymbol";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { assert, describe, before, env, it } from "../includes";
import { assertRejects } from "../utils/async";
import { db, dbm, tables, us } from "../../common-backend/includes";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { from, millisecondsPerResInterval, normalizePriceTime } from "../../common/utils/time";
import { TEST_DEFAULT_BASE, TEST_DEFAULT_PAIR, TEST_DEFAULT_QUOTE } from "../constants";


describe(SymbolService.name, () => {

    // Defaults
    const exchange = env.PRIMO_DEFAULT_EXCHANGE;
    const symbolPair = TEST_DEFAULT_PAIR;
    const res = TimeResolution.ONE_MINUTE;
    const defaultPriceFetchParams: Partial<PriceDataParameters> = {
        exchange,
        symbolPair,
        fetchDelay: 500,
        res: TimeResolution.ONE_HOUR,
        from: from("2021-11-01T00:00:00"),
        to: from("2021-11-10T00:00:00"),
    };

    Object.freeze(defaultPriceFetchParams);

    let ctx: TestDataCtx = null;
    let sym: SymbolService = new SymbolService();

    // Note: Slow. Only use if necessary.
    async function resetDb() {
        await dbm.rollback();
        await dbm.migrate();
        ctx = await getTestData();
    }

    async function clearTestPrices() {
        if (!env.isTest()) {
            throw new Error(`Can only clear test prices during test`);
        }

        return db(tables.Prices).delete();
    }

    before(async () => {
        await resetDb();
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
    });

    describe(sym.addSymbolPrice.name, () => {
        it("throws on null open/low/high/close", async () => {
            // TEST
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
                volume: Money("1"),
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

            // TODO: Shrink
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
                volume: Money("1"),
            });

            const newPrice = await sym.addSymbolPrice(dummyPriceProps);
            assert.equal(newPrice.close.toString(), precisePriceStr);
        });

        it("throws if the base or quote symbols do not exist", async () => {
            const priceProps = createTestPrice({
                resId: TimeResolution.ONE_MINUTE,
                baseSymbolId: "NONEXISTENT1",
                quoteSymbolId: "NONEXISTENT2",
                ts: normalizePriceTime(TimeResolution.ONE_MINUTE, new Date()),
            });

            await assertRejects(() => sym.addSymbolPrice(priceProps));
        });

        it("does not throw when adding a price for the same minute", async () => {
            await clearTestPrices();

            const { testSymbol1, testSymbol2 } = ctx;

            const sameMinute = from("2000-01-01T00:00:00.000Z");

            const priceProps1 = createTestPrice({
                resId: TimeResolution.ONE_MINUTE,
                baseSymbolId: TEST_DEFAULT_BASE,
                quoteSymbolId: TEST_DEFAULT_QUOTE,
                ts: sameMinute,
                close: Money("888"),
            });

            const priceProps2 = Object.assign({}, priceProps1, { ts: sameMinute });

            // Conflicts should be ignored and there should be no duplicate price
            await sym.addSymbolPrice(priceProps1);
            await sym.addSymbolPrice(priceProps2);

            const prices = await sym.queryPricesForRange({ exchange, from: sameMinute, to: from("2000-01-01T00:01:00.000Z") });
            assert.lengthOf(prices, 1);

            const [p] = prices;
            assert.equal(p.close.toString(), priceProps1.close.toString());
        });

        it("enforces a multi-column uniqueness constraint", async () => {
            // TEST (raw SQL)
        });

        // ... TODO: other time resolutions
    });

    describe(sym.queryPricesForRange.name, () => {
        it("returns empty price array for unknown range", async () => {
            // TEST
        });


        it("correctly handles daylight savings boundaries", async () => {
            // TEST
        });


        // Specifically construct non-UTC Dates
        const start = DateTime.fromISO("2021-11-01T00:00:00-08:00").toJSDate();
        const end = DateTime.fromISO("2021-11-02T00:00:00-08:00").toJSDate();

        assert.equal(start.toString(), "Mon Nov 01 2021 08:00:00 GMT+0000 (Coordinated Universal Time)");
        assert.equal(end.toString(), "Tue Nov 02 2021 08:00:00 GMT+0000 (Coordinated Universal Time)");

        const params: Partial<PriceDataParameters> = {
            ...defaultPriceFetchParams,
            from: start,
            to: end,
            symbolPair: TEST_DEFAULT_PAIR,
        };

        // Boundary-aligned inputs
        testExchangeData(TimeResolution.ONE_HOUR, start, end, from("2021-11-01T08:00:00.000Z"), from("2021-11-02T07:00:00.000Z"));
        testExchangeData(TimeResolution.TWO_HOURS, start, end, from("2021-11-01T08:00:00.000Z"), from("2021-11-02T06:00:00.000Z"));
        testExchangeData(TimeResolution.FOUR_HOURS, start, end, from("2021-11-01T08:00:00.000Z"), from("2021-11-02T04:00:00.000Z"));
        testExchangeData(TimeResolution.SIX_HOURS, start, end, from("2021-11-01T06:00:00.000Z"), from("2021-11-02T06:00:00.000Z"));
        testExchangeData(TimeResolution.TWELVE_HOURS, start, end, from("2021-11-01T00:00:00.000Z"), from("2021-11-02T00:00:00.000Z"));

        // Offset "from" inputs
        // Half-interval start offset
        testExchangeData(TimeResolution.ONE_HOUR, from("2021-11-01T00:30:00-08:00"), end, from("2021-11-01T08:00:00.000Z"), from("2021-11-02T07:00:00.000Z"));
        testExchangeData(TimeResolution.TWO_HOURS, from("2021-11-01T01:00:00-08:00"), end, from("2021-11-01T08:00:00.000Z"), from("2021-11-02T06:00:00.000Z"));
        testExchangeData(TimeResolution.FOUR_HOURS, from("2021-11-01T02:00:00-08:00"), end, from("2021-11-01T08:00:00.000Z"), from("2021-11-02T04:00:00.000Z"));
        testExchangeData(TimeResolution.SIX_HOURS, from("2021-11-01T03:00:00-08:00"), end, from("2021-11-01T06:00:00.000Z"), from("2021-11-02T06:00:00.000Z"));
        testExchangeData(TimeResolution.TWELVE_HOURS, from("2021-11-01T03:00:00-08:00"), end, from("2021-11-01T00:00:00.000Z"), from("2021-11-02T00:00:00.000Z"));

        // TODO: Test offset end dates

        it("matches exchange prices when using TSDB bucketing", async () => {
            // TODO: Ensure 5min data rolled up from TSDB matches 5min data from Binance
        });

        it("produces data that matches exchange data at 1m", async (ctx) => {

            // Skipped to avoid spamming Binance
            ctx.skip();

            const start = from("2021-09-12T00:00:00");
            const end = from("2021-09-12T00:30:00");
            const args: PriceDataParameters = {
                exchange: env.PRIMO_DEFAULT_EXCHANGE,
                res: TimeResolution.ONE_MINUTE,
                symbolPair: "BTC/BUSD",
                from: start,
                to: end,
                fetchDelay: 0,
            };
            const [, rawPrices] = await sym.fetchPriceDataFromExchange(args);
            const { missingRanges, prices, warnings } = await sym.getSymbolPriceData(args);
            assert.lengthOf(missingRanges, 0);
            assert.lengthOf(warnings, 0);
            assert.equal(rawPrices.length, prices.length);

            for (let i = 0; i < prices.length; ++i) {
                const a = prices[i];
                const b = rawPrices[i] as Price;
                assert.equal(a.open.toString(), b.open.toString());
                assert.equal(a.low.toString(), b.low.toString());
                assert.equal(a.high.toString(), b.high.toString());
                assert.equal(a.close.toString(), b.close.toString());
            }
        });

        it("correctly rolls up 1m data to 15m", async (ctx) => {

            // Not using rollups
            ctx.skip();

            const start = from("2021-09-12T00:00:00");
            const end = from("2021-09-12T00:30:00");
            const args: PriceDataParameters = {
                exchange: env.PRIMO_DEFAULT_EXCHANGE,
                res: TimeResolution.ONE_MINUTE,
                symbolPair: TEST_DEFAULT_PAIR,
                from: start,
                to: end,
                fetchDelay: 0,
            };
            const [, rawPrices1m] = await sym.fetchPriceDataFromExchange(args);

            args.res = TimeResolution.FIFTEEN_MINUTES;
            const [, rawPrices15m] = await sym.fetchPriceDataFromExchange(args);

            const rolledUpPrices = await sym.updateSymbolPrices(args);

            assert.equal(rolledUpPrices.length, rawPrices15m.length);

            for (let i = 0; i < rolledUpPrices.length; ++i) {
                const a = rolledUpPrices[i];
                const b = rawPrices15m[i] as Price;
                assert.equal(a.open.toString(), b.open.toString());
                assert.equal(a.low.toString(), b.low.toString());
                assert.equal(a.high.toString(), b.high.toString());
                assert.equal(a.close.toString(), b.close.toString());
                assert.equal(a.volume.toString(), b.volume.toString());
            }
        });


        function testExchangeData(res: TimeResolution, start: Date, end: Date, expectedStart: Date, expectedEnd: Date) {
            it(`returns the correct results for '${res}' starting ${start.toISOString()} ending ${end.toISOString()}`, async () => {
                let appliedParams = { ...params, res };
                const [exchangePricesRaw, exchangePrices] = await sym.fetchPriceDataFromExchange(appliedParams as PriceDataParameters);
                await sym.getSymbolPriceData(appliedParams);
                const primoPrices = await sym.queryPricesForRange(appliedParams);

                assert.deepEqual(primoPrices, exchangePrices);

                const [exFirst] = exchangePrices;
                const [primoFirst] = primoPrices;
                const [exLast] = exchangePrices.slice(-1);
                const [primoLast] = exchangePrices.slice(-1);

                assert.equal(exFirst.ts.toISOString(), expectedStart.toISOString(), `first exchange price @ ${res}`);
                assert.equal(primoFirst.ts.toISOString(), exFirst.ts.toISOString(), `first primo price @ ${res}`);
                assert.equal(exLast.ts.toISOString(), expectedEnd.toISOString(), `last exchange price @ ${res}`);
                assert.equal(primoLast.ts.toISOString(), exLast.ts.toISOString(), `last primo price @ ${res}`);
            });
        }

        function testRollupCounts(res: TimeResolution, numExpected: number, offsetToCheck: number) {
            it(`produces the correct number of rolled up candles ${res}`, async () => {
                await clearTestPrices();

                const symbolPair = `${ctx.testSymbol1.id}/${ctx.testSymbol2.id}`;

                const start = from("2000-01-01T00:00:00");
                const end = from("2000-01-01T01:00:00");

                await fillRangeWithData(exchange, symbolPair, TimeResolution.ONE_MINUTE, start, end, increasingPriceGenerator);

                const params: PriceDataParameters = {
                    exchange,
                    symbolPair,
                    res: TimeResolution.ONE_MINUTE,
                    from: start,
                    to: end,
                    fillMissing: true,
                };
                const pricesAt1m = await sym.queryPricesForRange(params);

                params.res = res;
                const pricesAtRes = await sym.queryPricesForRange(params);

                const closesAt1m = pricesAt1m.map(p => p.close.toNumber());
                const closesAtNMinutes = pricesAtRes.map(p => p.close.toNumber());

                assert.lengthOf(pricesAt1m, 60);
                assert.lengthOf(pricesAtRes, numExpected);

                // Ensure that rollups are based on last value 
                assert.equal(closesAt1m[offsetToCheck - 1], closesAtNMinutes[0]);
            });
        }

        // Not currently using rollups.
        /*
        testRollupCounts(TimeResolution.ONE_MINUTE, 60, 1);
        testRollupCounts(TimeResolution.FIVE_MINUTES, 12, 5);
        testRollupCounts(TimeResolution.FIFTEEN_MINUTES, 4, 15);
        testRollupCounts(TimeResolution.ONE_HOUR, 1, 60);
        */
    });

    describe(sym.updateSymbolPrices.name, () => {
        it("adds unknown symbols to the DB", async () => {
            // TEST
        });
    });


    describe(sym.getKnownSymbolNames.name, () => {
        it("returns known symbols", async () => {
            // TEST
        });
    });

    describe(sym.addPriceData.name, () => {
        it("throws if prices don't all have the same symbol IDs as the first one", async () => {
            // TEST
        });

        it("produces the correct range for 1m resolution", async () => {
            await clearTestPrices();

            const start = from("2000-01-01T00:00:00");
            const end = from("2000-01-01T01:00:00");
            const res = TimeResolution.ONE_MINUTE;
            await fillRangeWithData(exchange, symbolPair, res, start, end, sineGenerator);
            const prices = await sym.queryPricesForRange({
                res,
                from: start,
                to: end,
                symbolPair,
            });

            assert.lengthOf(prices, 60);
            assert.equal(prices[0].ts.getTime(), start.getTime());

            // Last entry should be at 00:00:59
            const expectedEnd = DateTime.fromISO("2000-01-01T00:59:00").toJSDate();
            assert.equal(prices[prices.length - 1].ts.getTime(), expectedEnd.getTime());

            // TODO: Handle the weird null values at end...
        });

        // 1m: less-than
        testTimeRangeAtRes(
            TimeResolution.ONE_MINUTE,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T00:00:59.999"),
            1,
            from("2000-01-01T00:00:00"));

        // 1m: on-the-dot
        testTimeRangeAtRes(
            TimeResolution.ONE_MINUTE,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T00:01:00"),
            1,
            from("2000-01-01T00:00:00"));

        // 1m: more-than
        testTimeRangeAtRes(
            TimeResolution.ONE_MINUTE,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T00:02:00"),
            2,
            from("2000-01-01T00:01:00"));

        // 5m: less-than
        testTimeRangeAtRes(
            TimeResolution.FIVE_MINUTES,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T00:04:59.999"),
            1,
            from("2000-01-01T00:00:00"));

        // 5m: on-the-dot
        testTimeRangeAtRes(
            TimeResolution.FIVE_MINUTES,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T00:05:00"),
            1,
            from("2000-01-01T00:00:00"));

        // 5m: more-than
        testTimeRangeAtRes(
            TimeResolution.FIVE_MINUTES,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T00:06:00"),
            2,
            from("2000-01-01T00:05:00"));

        // 15m: less-than
        testTimeRangeAtRes(
            TimeResolution.FIFTEEN_MINUTES,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T00:14:59.999"),
            1,
            from("2000-01-01T00:00:00"));

        // 15m: on-the-dot
        testTimeRangeAtRes(
            TimeResolution.FIFTEEN_MINUTES,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T00:15:00"),
            1,
            from("2000-01-01T00:00:00"));

        // 15m: more-than
        testTimeRangeAtRes(
            TimeResolution.FIFTEEN_MINUTES,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T00:16:00"),
            2,
            from("2000-01-01T00:15:00"));

        // 1h: less-than
        testTimeRangeAtRes(
            TimeResolution.ONE_HOUR,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T00:59:59.999"),
            1,
            from("2000-01-01T00:00:00"));

        // 1h: on-the-dot
        testTimeRangeAtRes(
            TimeResolution.ONE_HOUR,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T01:00:00"),
            1,
            from("2000-01-01T00:00:00"));

        // 1h: more-than
        testTimeRangeAtRes(
            TimeResolution.ONE_HOUR,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T02:00:00"),
            2,
            from("2000-01-01T01:00:00"));

        // TODO: Why did these not fail with the multi-hour bug
        // 4h: less-than
        testTimeRangeAtRes(
            TimeResolution.FOUR_HOURS,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T03:59:59.999"),
            1,
            from("2000-01-01T00:00:00"));

        // 4h: on-the-dot
        testTimeRangeAtRes(
            TimeResolution.FOUR_HOURS,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T04:00:00"),
            1,
            from("2000-01-01T00:00:00"));

        // 4h: more-than
        testTimeRangeAtRes(
            TimeResolution.FOUR_HOURS,
            from("2000-01-01T00:00:00"),
            from("2000-01-01T05:00:00"),
            2,
            from("2000-01-01T04:00:00"));

        // TEST: other time resolutions, resolution overlaps (e.g. 5m separate from 1m)

        it("fills gaps in the input data using the last known value", async () => {
            await clearTestPrices();

            const start = from("2001-01-01T00:00:00");
            const end = from("2001-01-01T01:00:00");
            const rawPrices = await generateTestPrices(exchange, symbolPair, res, start, end);
            assert.lengthOf(rawPrices, 60);

            // Poke some holes in the data

            // Remove first entry 2001-01-01T00:01:00
            // Remove second-to-last entry 2001-01-1T00:58:00
            // Worth noting that truncating the actual end of the series will not result in fillage.
            rawPrices.splice(1, 1);
            rawPrices.splice(rawPrices.length - 2, 1);

            assert.lengthOf(rawPrices, 58);

            await sym.addPriceData(exchange, TimeResolution.ONE_MINUTE, rawPrices);
            const addedPrices = await sym.queryPricesForRange({
                exchange,
                symbolPair,
                res,
                from: start,
                to: end,
                fillMissing: true,
            });

            // Should get 60 back still, as the missing prices will be interpolated
            // NOTE: Not for now, thanks to a weird thing with TimescaleDB. See addPriceData.
            assert.lengthOf(addedPrices, 60);

            // Peep the filled entries for prices
            const [firstPrice, secondPrice] = addedPrices;
            const secondFromLastPrice = addedPrices[addedPrices.length - 2];
            const thirdFromLastPrice = addedPrices[addedPrices.length - 3];

            assert.equal(firstPrice.ts.getTime(), from("2001-01-01T00:00:00").getTime());
            assert.equal(secondPrice.ts.getTime(), from("2001-01-01T00:01:00").getTime());
            assert.equal(secondFromLastPrice.ts.getTime(), from("2001-01-01T00:58:00").getTime());
            assert.equal(thirdFromLastPrice.ts.getTime(), from("2001-01-01T00:57:00").getTime());

            // Prices should have been filled using the previous observed value
            assert.equal(secondPrice.open.toString(), firstPrice.open.toString());
            assert.equal(secondPrice.low.toString(), firstPrice.low.toString());
            assert.equal(secondPrice.high.toString(), firstPrice.high.toString());
            assert.equal(secondPrice.close.toString(), firstPrice.close.toString());
            assert.equal(secondPrice.volume.toString(), firstPrice.volume.toString());
            assert.equal(secondFromLastPrice.close.toString(), thirdFromLastPrice.close.toString());
        });

        // TEST truncation of a series (should not be gap-filled)
    });

    describe(`test function ${fillRangeWithData.name}`, () => {
        it("produces the correct range to 5m resolution", async () => {
            // TEST
        });
    });

    describe(`test function '${fill.name}'`, () => {
        it("correctly fills a range", async () => {
            await clearTestPrices();

            // Generate some prices so we can test around them
            const start = from(`1991-01-01T00:00:00`);
            const end = from(`1991-01-01T00:03:00`);

            const startFill = from(`1991-01-01T00:01:00`);
            const endFill = from(`1991-01-01T00:02:00`);

            await fill(startFill, endFill);

            const prices = await sym.queryPricesForRange({ from: start, to: end });

            assert.lengthOf(prices, 1);
        });
    });

    describe(sym.getMissingRanges.name, () => {
        it("returns a completely empty range when there's no price data", async () => {
            const startEmpty = from("1990-01-01T00:00:00");
            const endEmpty = from("1990-01-01T00:10:00");

            const ranges = await getMissingRanges(startEmpty, endEmpty);
            assert.lengthOf(ranges, 1);

            const [range] = ranges;
            assert.equal(range.start.getTime(), startEmpty.getTime());
            assert.equal(range.end.getTime(), endEmpty.getTime());
        });

        it("returns empty ranges before and after a filled range", async () => {
            await clearTestPrices();

            // Generate some prices so we can test around them
            const startFill = from(`1991-01-01T00:01:00`);
            const endFill = from(`1991-01-01T00:02:00`);

            await fill(startFill, endFill);

            // 1 minute before and after the filled range
            const startTest = from(`1991-01-01T00:00:00`);
            const endTest = from(`1991-01-01T00:03:00`);

            const ranges = await getMissingRanges(startTest, endTest);

            // Before, after
            assert.lengthOf(ranges, 2);

            const [before, after] = ranges;

            // Empty range before data
            assert.equal(before.start.getTime(), startTest.getTime());
            assert.equal(before.end.getTime(), startFill.getTime() - 1);

            // Empty range after data
            assert.equal(after.start.getTime(), endFill.getTime());
            assert.equal(after.end.getTime(), endTest.getTime());
        });

        it("does not produce a trailing missing range", async () => {
            await clearTestPrices();

            // Generate some prices so we can test around them
            const start = from("2021-09-01T00:00:00");
            const end = from("2021-09-01T00:30:00");
            await fill(start, end);
            const ranges = await getMissingRanges(start, end);
            assert.lengthOf(ranges, 0);
        });
        // TEST (more)
    });

    describe(sym.parseSymbolPair.name, () => {
        it("correctly parses pairs with slashes", async () => {
            // TEST
        });

        it("correctly parses pairs with underscores", async () => {
            // TEST
        });

    });

    describe(sym.updateGlobalSymbolPrices.name, () => {
        it("updates symbol prices for a market", async () => {
            // TEST
        });
    });

    describe(sym.deriveTradeSymbolFromCCXT.name, () => {
        it("derives a proper `TradeSymbol` from a CCXT market def", async () => {
            // TEST
        });
    });


    describe(sym.loadMarketDefinitions.name, () => {
        it("loads some markets", async () => {
            // TEST
        });

        it("stores market definitions in the cache", async () => {
            // TEST
        });

        it("updates the DB", async () => {
            // TEST
        });
    });

    function testTimeRangeAtRes(res: TimeResolution, start: Date, end: Date, expectedCount: number, expectedEnd: Date) {
        it(`produces the correct range for ${res} resolution for ${start.toISOString()} to ${end.toISOString()}`, async () => {
            await clearTestPrices();

            const symbolPair = `${ctx.testSymbol1.id}/${ctx.testSymbol2.id}`;
            await fillRangeWithData(exchange, symbolPair, res, start, end, sineGenerator);
            const prices = await sym.queryPricesForRange({
                res,
                from: start,
                to: end,
                symbolPair,
            });

            assert.lengthOf(prices, expectedCount);
            assert.equal(prices[0].ts.getTime(), start.getTime());
            assert.equal(prices[prices.length - 1].ts.getTime(), expectedEnd.getTime());
        });
    }
});
