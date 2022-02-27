import { TestDataCtx, getTestData, generateTestPrices } from "../utils/test-data";
import { ResultsService } from "../../common-backend/services/ResultsService";
import { assert, describe, before, env, it } from "../includes";
import { beforeEach } from "intern/lib/interfaces/tdd";

// Just a copy-paste stub for new suites. Delete this.

describe(ResultsService.name, () => {
    let ctx: TestDataCtx = null;
    let results: ResultsService = new ResultsService();

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(async () => {
        results = new ResultsService();
    });

    describe(results.addResultsForBotRun.name, () => {
        it("saves the result set in the DB", async () => {
            // TEST
        });

        it("throws if the instance ID doesn't match the run", async () => {
            // TEST
        });
    });

    describe(results.getLatestResultsForRunningBot.name, () => {
        it("returns a well-formed report", async () => {
            // TEST
        });

        it("correctly summates gross, profit, and fees", async () => {
            // TEST
        });

        it("returns the correct trades from the latest runs", async () => {
            // TEST
        });

        it("correctly handles multiple runs", async () => {
            // TEST
        });
    });

    describe(results.getTradesForBot.name, () => {
        it("accounts for trailing orders", async () => {
            // TEST
        });
        
        it("correctly handles multiple runs", async () => {
            // TEST
        });
    });

    describe(results.computeTradingResults.name, () => {
        it("returns zero for summary fields when no orders exist", () => {
            // TEST
        });
        it("correctly summates results", async () => {
            // TEST
        });

        it("correctly handles trailing order", async () => {
            // TEST: Uses drawdown of the last open order
        });

        it("correctly handles trailing order across multiple runs", async () => {
            // TEST: Yikes... may need to record in the DB whether or not the assets were returned to pool
        });
    });

    describe(results.getLatestBacktestResultsForInstance.name, () => {
        it("throws if the instance ID is missing", async () => {
            // TEST
        });

        it("gets the latest result when there are multiple", async () => {
            // TEST
        });

        it("returns null if no results were found", async () => {
            // TEST
        });
    });
});
