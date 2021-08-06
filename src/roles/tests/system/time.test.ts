import "intern";
import Knex from "knex";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { SymbolService } from "../../common-backend/services/SymbolService";
import { TestDataCtx, getTestData, createTestPrice } from "../utils/test-data";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { assert, describe, before, env, it } from "../includes";
import { normalizePriceTime } from "../../common/utils/time";


describe("time handling", () => {
    let ctx: TestDataCtx = null;
    let sym: SymbolService = new SymbolService();

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(async () => {
        sym = new SymbolService();
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
        test(TimeResolution.ONE_MINUTE, "00:12:34:001", "00:12:00:000");
        test(TimeResolution.ONE_MINUTE, "00:12:59:999", "00:12:00:000");

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
        test(TimeResolution.ONE_HOUR, "00:01:01:001", "00:00:00:000");
        test(TimeResolution.ONE_HOUR, "00:59:00:000", "00:00:00:000");

        // TODO: Week and month
    });
});
