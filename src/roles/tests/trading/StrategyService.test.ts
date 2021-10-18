import "intern";
import { it } from "intern/lib/interfaces/bdd";
import env from "../../common-backend/env";
import { StrategyService } from "../../common-backend/services/StrategyService";
import { before, beforeEach } from "intern/lib/interfaces/tdd";
import { assert, describe } from "../includes";
import { addNewBotDefAndInstance, clearTestData, getTestData, TestDataCtx } from "../utils/test-data";


describe(StrategyService.name, () => {

    // Defaults
    const exchange = env.PRIMO_DEFAULT_EXCHANGE;
    const symbolPair = "BTC/USD";
    let ctx: TestDataCtx = null;
    let strats: StrategyService = new StrategyService();

    before(async () => ctx = await getTestData());
    beforeEach(async () => strats = new StrategyService());


    describe(strats.getDefaultWorkspaceForUser.name, () => {
        it("returns the default workspace for the user", async () => {

        });
    });

    describe(strats.addNewBotDefinition.name, () => {
        it("creates a new bot definition and saves it in the DB", async () => {
            // TEST
        });
    });

    describe(strats.forkBotInstance.name, () => {
        it("creates a new instance from a bot declaration", async () => {
            // TEST
        });
    });

    describe(strats.getRunningBotsForFilter.name, () => {
        it("returns non-paused and non-stopped bots", async () => {
            // TEST 
        });
    });

    describe(strats.getBots.name, () => {
        it("returns entries for non running bot", async () => {
            await clearTestData();
            const { instance } = await addNewBotDefAndInstance();
            await strats.startBotInstance({ id: instance.id });
            await strats.stopBotInstance(instance.id);

            const { workspace, strategy } = ctx;

            const botListEntries = await strats.getBots(workspace.id, strategy.id);
            assert.lengthOf(botListEntries, 1);

            const [e] = botListEntries;
            const { run } = e;
            assert.isFalse(run.active);
        });

        it("returns the latest run for each bot", async () => {
            await clearTestData();

            const { instance } = await addNewBotDefAndInstance();
            await strats.startBotInstance({ id: instance.id });
            await strats.stopBotInstance(instance.id);
            await strats.startBotInstance({ id: instance.id });

            const { workspace, strategy } = ctx;

            const botListEntries = await strats.getBots(workspace.id, strategy.id);
            assert.lengthOf(botListEntries, 1);

            const [e] = botListEntries;
            const { run } = e;
            assert.isTrue(run.active);
        });

        it("only returns items from the given workspace and strategy", async () => {
            // TEST
        });
    });

    describe(strats.getBotDescriptors.name, () => {
        it("throws if the mode is not live or forward-test", async () => {
            // TEST
        });

        it("returns the correct number of running bots", async () => {
            // TEST
        });
    });

    describe(strats.getRunsForBot.name, () => {
        it("returns nothing for a bot that hasn't run", async () => {
            const { instance } = await addNewBotDefAndInstance();
            const initialRuns = await strats.getRunsForBot(instance.id);
            assert.lengthOf(initialRuns, 0);
        });

        it("returns an active run for a running bot", async () => {
            const { instance } = await addNewBotDefAndInstance();
            await strats.startBotInstance({ id: instance.id });

            const activeRuns = await strats.getRunsForBot(instance.id);
            assert.lengthOf(activeRuns, 1);

            const [activeRun] = activeRuns;
            assert.equal(activeRun.active, true);
        });

        it("returns an inactive run for a stopped bot", async db => {
            const { instance } = await addNewBotDefAndInstance();
            await strats.startBotInstance({ id: instance.id });
            await strats.stopBotInstance(instance.id);

            const runs = await strats.getRunsForBot(instance.id);
            assert.lengthOf(runs, 1);
            const [firstRun] = runs;
            assert.isFalse(firstRun.active);
        });

        it("returns an active run for a restarted bot", async () => {
            const { instance } = await addNewBotDefAndInstance();
            await strats.startBotInstance({ id: instance.id });
            await strats.stopBotInstance(instance.id);
            await strats.startBotInstance({ id: instance.id });

            const runs = await strats.getRunsForBot(instance.id);
            assert.lengthOf(runs, 2);
            const [firstRun, secondRun] = runs;
            assert.isFalse(firstRun.active);
            assert.isTrue(secondRun.active);
        });
    });

    describe(strats.getBotForOrder.name, () => {
        it("returns only a def for a bot with no instances", async () => {
            // LEFTOFF
            // TEST
        });

        it("returns only a def and instance for a bot with no runs", async () => {
            // LEFTOFF
            // TEST
        });


        it("returns a def, an instance, and a run for a running bot", async () => {
            // TEST
        });

        it("returns a def, an instance, and no run for a stopped bot", async () => {
            // TEST
        });
    });

    describe(strats.getBotInstanceById.name, () => {
        it("gets an instance by ID", async () => {
            // TEST
        });
    });

    describe(strats.getBotInstanceByName.name, () => {
        it("gets an instance by name", async () => {
            // TEST
        });

        it("gets an instance by name unique to a strategy and workspace", async () => {
            // TEST
        });
    });
    describe(strats.getCurrentRunForBot.name, () => {
        it("retrieves the current run for a bot", async () => {
            // TEST
        });
    });

    describe(strats.getLatestRunForInstance.name, () => {
        // TEST
        it("retrieves the latest run for a bot", async () => {
            // TEST
        });
    });

    it("returns null if there is no active run", async () => {
        // TEST
    });

    describe(strats.pauseBotInstance.name, () => {
        it("pauses the current bot run", async () => {
            // TEST
        });
    });

    describe(strats.startBotInstance.name, () => {
        it("marks a new bot as initializing", async () => {
            // TEST
        });

        it("sets a paused bot to active", async () => {
            // TEST
        });

        it("starts a stopped bot and creates a new run", async () => {
            // TEST
        });
    });

    describe(strats.pauseStrategy.name, () => {
        it("sets a strategy to the paused state", async () => {
            // TEST
        });

        it("sets all child bots to the paused state aside from halted ones", async () => {
            // TEST
        });

        it("leaves a bot run running", async () => {
            // TEST
        });
    });

    describe(strats.pauseBot.name, () => {
        it("marks a running bot as paused", async () => {
            // TEST
        });
    });

    describe(strats.startStrategy.name, () => {
        it("marks all the bots in a strategy active", async () => {
            // TEST
        });
    });

    describe(strats.createNewInstanceFromDef.name, () => {
        it("starts a new bot instance given a bot definition", async () => {
            // TEST
        });

        it("creates a new bot run", async () => {
            // TEST
        });
    });

    describe(strats.stopBotInstance.name, () => {
        it("ends the current bot run", async () => {
            // TEST
        });
    });

    describe(strats.stopStrategy.name, () => {
        it("puts a plan and any child bot instances in the stopped state", async () => {
            // TEST
        });
    });
});
