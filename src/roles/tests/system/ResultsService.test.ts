import { TestDataCtx, getTestData } from "../utils/test-data";
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

    describe(results.getLatestResultsForBot.name, () => {
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
