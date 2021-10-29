import { dbm } from "../common-backend/includes";
import { assert, env } from "./includes";


//import "./genetics/genetics.test"; /*

import "./system/database.test";
import "./system/numbers.test";
import "./system/time.test";
import "./system/CommandService.test";
import "./system/ResultsService.test";
import "./system/SpoolerService.test";
import "./system/TimeSeriesCache.test";
import "./system/UserService.test";
import "./genetics/genetics.test";
import "./trading/StrategyService.test";
import "./trading/SymbolService.test";
import "./trading/CapitalService.test";
import "./genetics/GenotypeService.test";

//*/

intern.config.defaultTimeout = 1000 * 60 * 10;

intern.on("beforeRun", async () => {
    console.log(`Rolling back test database...`);
    await dbm.rollback(true);
    console.log(`Migrating test database...`);
    await dbm.migrate();

    console.log(`Verifying test environment flag...`);
    assert.isTrue(env.isTest(), "expected test environment flag to be set");
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
