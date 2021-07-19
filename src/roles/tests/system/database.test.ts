import "intern"
import Knex from "knex";
import { assert, describe, env, it } from "../includes";


describe("database", () => {
    let kx: Knex.QueryBuilder

    it("can connect", async () => {
        console.log("TODO: Tests!");
    });
});


intern.on("afterRun", () => {
    let hasErrors = false;
    for (const suite of intern.suites) {
        if (suite.numFailedTests > 0) {
            hasErrors = true;
            break;
        }
    }

    // Note: Knex hangs the node process, so we manually exit here.
    process.exit(hasErrors ? -1 : 0);
});
