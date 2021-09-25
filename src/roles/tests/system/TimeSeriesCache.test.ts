import { beforeEach } from "intern/lib/interfaces/tdd";
import { Price } from "../../common/models/markets/Price";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { TimeSeriesCache, TimeSeriesCacheArgs } from "../../common-backend/system/TimeSeriesCache";
import { assert, describe, before, env, it } from "../includes";
import { from } from "../../common/utils/time";
import { generateTestPrices, getTestData, TestDataCtx } from "../utils/test-data";
import { sleep } from "../../common/utils";


describe(TimeSeriesCache.name, () => {
    let ctx: TestDataCtx = null;
    let tscArgs: TimeSeriesCacheArgs = {
        accessor: (p: Price) => p.ts,
        maxKeys: 100,
        maxItemsPerKey: 100,
        checkForGaps: false,
    };

    const symbols = "ETH/BTC";
    let tsc: TimeSeriesCache<Partial<Price>> = new TimeSeriesCache<Partial<Price>>(tscArgs);

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(async () => {
        tsc = new TimeSeriesCache(tscArgs);
    });

    describe(tsc.append.name, () => {
        it("adds a new item to the cache", async () => {
            const start = from("2021-01-01");
            const end = from("2021-01-31");
            const key = "ETH/BTC@1D";
            const items: Partial<Price>[] = await generateTestPrices(env.PRIMO_DEFAULT_EXCHANGE, symbols, TimeResolution.ONE_DAY, start, end);
            const [item] = items;
            tsc.append(key, item);

            const fetchedItem = tsc.getItem(key, item.ts);
            assert.deepEqual(fetchedItem, item);
        });

        it("adds new items to the cache", async () => {
            const start = from("2021-01-01");
            const end = from("2021-01-31");
            const key = "ETH/BTC@1D";
            const items: Partial<Price>[] = await generateTestPrices(env.PRIMO_DEFAULT_EXCHANGE, symbols, TimeResolution.ONE_DAY, start, end);
            tsc.append(key, items);

            const entry = tsc.getEntry(key);
            assert.isNotNull(entry);
            assert.equal(items.length, entry.items.length);
        });

        it("removes items when maxItemsPerKey is exceeded", async () => {
            const start = from("2021-01-01T00:00:00");
            const end = from("2021-01-01T02:00:00");
            const key = "ETH/BTC@1m";
            const items: Partial<Price>[] = await generateTestPrices(env.PRIMO_DEFAULT_EXCHANGE, symbols, TimeResolution.ONE_MINUTE, start, end);
            assert.ok(items.length > tscArgs.maxItemsPerKey);
            tsc.append(key, items);

            const entry = tsc.getEntry(key);
            assert.isNotNull(entry);
            assert.equal(items.length, tscArgs.maxItemsPerKey);
        });

        it("removes oldest entry when maxKeys is exceeded", async () => {
            const start = from("2021-01-01T00:00:00");
            const end = from("2021-01-01T02:00:00");

            const items: Partial<Price>[] = await generateTestPrices(env.PRIMO_DEFAULT_EXCHANGE, symbols, TimeResolution.ONE_MINUTE, start, end);

            for (let i = 0; i < tscArgs.maxKeys; ++i) {
                tsc.append(i + "", items);
                await sleep(1);
            }

            const firstEntryExisting = tsc.getEntry("0");
            assert.exists(firstEntryExisting);

            tsc.append(tscArgs.maxKeys + "", items);
            
            const firstEntryNoLongerExisting = tsc.getEntry("0");
            assert.isNull(firstEntryNoLongerExisting);
        });
    });

    describe(tsc.getCachedRange.name, () => {
        it("returns items given a full range", async () => {
            const start = from("2021-01-01");
            const end = from("2021-01-02");
            const key = "ETH/BTC@15m";
            const items: Partial<Price>[] = await generateTestPrices(env.PRIMO_DEFAULT_EXCHANGE, symbols, TimeResolution.FIFTEEN_MINUTES, start, end);
            const [item] = items;
            tsc.append(key, item);
            const fetchedItem = tsc.getItem(key, item.ts);

            assert.deepEqual(fetchedItem, item);
        });

        it("returns the correct items for a subrange", async () => {
            const start = from("2021-01-01");
            const end = from("2021-01-10");
            const key = "ETH/BTC@1D";
            const items: Partial<Price>[] = await generateTestPrices(env.PRIMO_DEFAULT_EXCHANGE, symbols, TimeResolution.ONE_DAY, start, end);

            tsc.append(key, items);

            const srFrom = from("2021-01-02");
            const srTo = from("2021-01-08");
            const subrange = tsc.getCachedRange(key, srFrom, srTo);

            const [first] = subrange;
            const last = subrange[subrange.length - 1];

            assert.equal(first.ts.getTime(), srFrom.getTime());
            assert.equal(last.ts.getTime(), from("2021-01-07").getTime());
        });
    });

    describe(tsc.getEntry.name, () => {
        it("returns null for a missing key", async () => {
            const start = from("2021-01-01");
            const end = from("2021-01-31");
            const key = "ETH/BTC@1D";
            const items: Partial<Price>[] = await generateTestPrices(env.PRIMO_DEFAULT_EXCHANGE, symbols, TimeResolution.ONE_DAY, start, end);
            const [item] = items;
            tsc.append(key, item);

            const fetchedItem = tsc.getItem("NONEXISTENT-KEY", item.ts);
            assert.isNull(fetchedItem);
        });

        it("returns an entry for a valid key", async () => {
            const start = from("2021-01-01T00:00:00");
            const end = from("2021-01-01T00:05:00");
            const key = "ETH/BTC@1m";
            const items: Partial<Price>[] = await generateTestPrices(env.PRIMO_DEFAULT_EXCHANGE, symbols, TimeResolution.ONE_MINUTE, start, end);
            const [item] = items;

            tsc.append(key, items);

            const entry = tsc.getEntry(key);
            assert.deepEqual(items, entry.items);
        });
    });

    describe(tsc.getItem.name, () => {
        it("does not throw on non-existent item", async () => {
            // TEST
            const key = "foo";
            const ne = tsc.getItem(key, from("2021-01-01T00:00:00"));
            assert.isNull(ne);
        });

        it("returns the correct item", async () => {
            const start = from("2021-01-01");
            const end = from("2021-01-04");
            const key = "ETH/BTC@1D";
            const items: Partial<Price>[] = await generateTestPrices(env.PRIMO_DEFAULT_EXCHANGE, symbols, TimeResolution.ONE_DAY, start, end);

            tsc.append(key, items);

            // Grab the middle item
            const item = tsc.getItem(key, from("2021-01-02T00:00:00.000"));
            assert.deepEqual(item, items[1]);
        });
    });
});
