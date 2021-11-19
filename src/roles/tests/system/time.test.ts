import "intern";
import { DateTime } from "luxon";
import Knex from "knex";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { SymbolService } from "../../common-backend/services/SymbolService";
import { TestDataCtx, createTestPrice, getTestData } from "../utils/test-data";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { assert, describe, before, env, it } from "../includes";
import { from, getTimeframeForResolution, millisecondsPerResInterval, normalizePriceTime, shortDateAndTime, splitRanges } from "../../common/utils/time";
import { assertEqualTimes } from "../utils/misc";
import { presentDuration } from "../../common/utils/time";


describe("time handling", () => {
    let ctx: TestDataCtx = null;
    let sym: SymbolService = new SymbolService();

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(async () => {
        sym = new SymbolService();
    });

    describe(presentDuration.name, () => {
        it("presents a duration object correctly", () => {

            // 1 day, 6 hours, 30 mins, 30 secs, 500 ms
            const str = presentDuration({
                days: 1,
                hours: 6,
                minutes: 30,
                seconds: 30,
                milliseconds: 500,
            });

            assert.equal(str, "1 days, 6 hours, 30 mins");
        });

        it("presents a duration in milliseconds correctly", () => {
            const duration =
                (1 * millisecondsPerResInterval(TimeResolution.ONE_DAY)) +
                (6 * millisecondsPerResInterval(TimeResolution.ONE_HOUR)) +
                (30 * millisecondsPerResInterval(TimeResolution.ONE_MINUTE)) +
                500;

            const str = presentDuration(duration);
            assert.equal(str, "1 days, 6 hours, 30 mins");
        });
    });

    describe(shortDateAndTime.name, () => {
        it("represents otherwise ambiguous times correctly via YYYY/MM/DD", async () => {
            const mooseBirthdayApprox = DateTime.fromISO("2018-12-22T00:00:00.000Z");
            const val = shortDateAndTime(mooseBirthdayApprox.toJSDate());
            assert.equal(val, "2018-12-22 00:00:00");
        });
    });

    function test(res: TimeResolution, dtStr1: string, dtStr2: string) {
        it(`${dtStr1} normalizes to ${dtStr2} with resolution ${res}`, async () => {
            const defaultDatePrefix = "01-01-1970";
            const defaultDateSuffix = "GMT";

            const constructed1 = dtStr1.length < 20
                ? defaultDatePrefix + " " + dtStr1
                : dtStr1
                ;

            const constructed2 = dtStr2.length < 20
                ? defaultDatePrefix + " " + dtStr2
                : dtStr2
                ;

            const dt1 = new Date(constructed1);
            const dt2 = new Date(constructed2);

            const n1 = normalizePriceTime(res, dt1);
            const n2 = normalizePriceTime(res, dt2);

            assert.equal(n1.getTime(), n2.getTime(), `Expected ${n1.toString()} to equal ${n2.toString()}`);
        });
    }

    describe(normalizePriceTime.name, () => {
        test(TimeResolution.ONE_SECOND, "00:12:34:000", "00:12:34:000");
        test(TimeResolution.ONE_SECOND, "00:12:34:001", "00:12:34:000");
        test(TimeResolution.ONE_SECOND, "00:12:34:123", "00:12:34:000");
        test(TimeResolution.ONE_SECOND, "00:12:34:999", "00:12:34:000");

        test(TimeResolution.TWO_SECONDS, "00:01:00:000", "00:01:00:000");
        test(TimeResolution.TWO_SECONDS, "00:01:00:001", "00:01:00:000");
        test(TimeResolution.TWO_SECONDS, "00:01:01:123", "00:01:00:000");
        test(TimeResolution.TWO_SECONDS, "00:01:03:999", "00:01:02:000");
        test(TimeResolution.TWO_SECONDS, "00:01:04:666", "00:01:04:000");
        test(TimeResolution.TWO_SECONDS, "00:01:59:999", "00:01:58:000");

        test(TimeResolution.ONE_MINUTE, "00:12:00:000", "00:12:00:000");
        test(TimeResolution.ONE_MINUTE, "00:12:01:000", "00:12:01:000");
        test(TimeResolution.ONE_MINUTE, "00:12:34:001", "00:12:34:000");
        test(TimeResolution.ONE_MINUTE, "00:12:59:999", "00:12:59:000");

        test(TimeResolution.FIVE_MINUTES, "00:00:00:000", "00:00:00:000");
        test(TimeResolution.FIVE_MINUTES, "00:01:00:001", "00:00:00:000");
        test(TimeResolution.FIVE_MINUTES, "00:05:01:002", "00:05:00:000");
        test(TimeResolution.FIVE_MINUTES, "00:05:59:999", "00:05:00:000");
        test(TimeResolution.FIVE_MINUTES, "00:06:00:123", "00:05:00:000");
        test(TimeResolution.FIVE_MINUTES, "00:59:00:345", "00:55:00:000");

        test(TimeResolution.FIFTEEN_MINUTES, "00:00:00:000", "00:00:00:000");
        test(TimeResolution.FIFTEEN_MINUTES, "00:00:00:123", "00:00:00:000");
        test(TimeResolution.FIFTEEN_MINUTES, "00:05:01:123", "00:00:00:000");
        test(TimeResolution.FIFTEEN_MINUTES, "00:14:59:999", "00:00:00:000");
        test(TimeResolution.FIFTEEN_MINUTES, "00:15:00:000", "00:15:00:000");
        test(TimeResolution.FIFTEEN_MINUTES, "00:15:00:001", "00:15:00:000");
        test(TimeResolution.FIFTEEN_MINUTES, "00:29:59:999", "00:15:00:000");
        test(TimeResolution.FIFTEEN_MINUTES, "00:30:00:999", "00:30:00:000");
        test(TimeResolution.FIFTEEN_MINUTES, "00:59:59:999", "00:45:00:000");

        test(TimeResolution.ONE_HOUR, "00:00:00:000", "00:00:00:000");
        test(TimeResolution.ONE_HOUR, "00:59:59:999", "00:00:00:000");
        test(TimeResolution.ONE_HOUR, "01:00:00:000", "01:00:00:000");
        test(TimeResolution.ONE_HOUR, "01:59:59:999", "01:00:00:000");
        test(TimeResolution.ONE_HOUR, "02:45:55:555", "02:00:00:000");

        test(TimeResolution.TWO_HOURS, "00:00:00:000", "00:00:00:000");
        test(TimeResolution.TWO_HOURS, "01:59:59:000", "00:00:00:000");
        test(TimeResolution.TWO_HOURS, "02:00:00:000", "02:00:00:000");
        test(TimeResolution.TWO_HOURS, "03:45:55:555", "02:00:00:000");
        test(TimeResolution.TWO_HOURS, "04:00:00:000", "04:00:00:000");

        test(TimeResolution.FOUR_HOURS, "00:00:00:000", "00:00:00:000");
        test(TimeResolution.FOUR_HOURS, "03:59:59:000", "00:00:00:000");
        test(TimeResolution.FOUR_HOURS, "04:00:00:000", "04:00:00:000");
        test(TimeResolution.FOUR_HOURS, "05:45:55:555", "04:00:00:000");
        test(TimeResolution.FOUR_HOURS, "08:00:00:000", "08:00:00:000");

        // TODO: Week and month
    });

    describe(millisecondsPerResInterval.name, () => {
        // TEST
    });

    describe(getTimeframeForResolution.name, () => {
        // TEST
    });

    describe(splitRanges.name, () => {
        const limit = 100;


        // ... for each resolution
        it("does not split a range that falls under the limit", async (ctx) => {
            const res = TimeResolution.ONE_MINUTE;
            const minutes = 5;
            const start = from("2000-01-01T00:00:00");
            const end = new Date(start.getTime() + minutes * 60 * 1000);
            const splits = splitRanges(res, { start, end }, limit);
            const [s] = splits;

            assert.lengthOf(splits, 1);
            assertEqualTimes(s.start, start);
            assertEqualTimes(s.end, end);
        });

        it("does not split a range that matches the limit", async (ctx) => {
            const res = TimeResolution.ONE_MINUTE;
            const minutes = limit;
            const start = from("2000-01-01T00:00:00");
            const end = new Date(start.getTime() + minutes * 60 * 1000);
            const splits = splitRanges(res, { start, end }, limit);
            const [s] = splits;

            assert.lengthOf(splits, 1);
            assertEqualTimes(s.start, start);
            assertEqualTimes(s.end, end);
        });

        it("splits (limit + 1) into 2 ranges", async () => {
            const max = 10;

            // TEST
            const res = TimeResolution.ONE_MINUTE;
            const minutes = max + 1;
            const start = from("2000-01-01T00:00:00");
            const end = new Date(start.getTime() + minutes * 60 * 1000);

            const splits = splitRanges(res, { start, end }, max);
            assert.lengthOf(splits, 2);

            const [s1, s2] = splits;
            assertEqualTimes(s1.start, start);
            assertEqualTimes(s1.end, from("2000-01-01T00:09:59.999"));

            assertEqualTimes(s2.start, from("2000-01-01T00:10:00"));
            assertEqualTimes(s2.end, from("2000-01-01T00:10:59.999"));
        });

        it("sets the correct start and end dates at the minute level", async () => {
            const max = 10;

            const res = TimeResolution.ONE_MINUTE;
            const minutes = max * 3;
            const start = from("2000-01-01T00:00:00");
            const end = new Date(start.getTime() + minutes * 60 * 1000);

            const splits = splitRanges(res, { start, end }, max);
            assert.lengthOf(splits, 3);

            const [s1, s2, s3] = splits;
            assertEqualTimes(s1.start, start);
            assertEqualTimes(s1.end, from("2000-01-01T00:09:59.999"));

            assertEqualTimes(s2.start, from("2000-01-01T00:10:00"));
            assertEqualTimes(s2.end, from("2000-01-01T00:19:59.999"));

            assertEqualTimes(s3.start, from("2000-01-01T00:20:00"));
            assertEqualTimes(s3.end, from("2000-01-01T00:29:59.999"));
        });

        it("can split correctly into the atomic time res unit", async () => {
            // TEST split minute-by-minute

        })



        // TEST ... other resolutions 
    });
});
