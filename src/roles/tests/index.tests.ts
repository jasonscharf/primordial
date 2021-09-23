import { dbm } from "../common-backend/includes";


//import "./trading/ResultsService.test"; /*

import "./system/database.test";
import "./system/numbers.test";
import "./system/time.test";
import "./system/CommandService.test";
import "./system/ResultsService.test";
import "./system/SpoolerService.test";
import "./system/TimeSeriesCache.test";
import "./system/UserService.test";
import "./genetics/GeneticParser.test";
import "./trading/StrategyService.test";
import "./trading/SymbolService.test";
import "./trading/CapitalService.test";
//*/


intern.on("beforeRun", async () => {
    console.log(`Rolling back test database...`);
    await dbm.rollback(true);
    console.log(`Migrating test database...`);
    await dbm.migrate();
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
