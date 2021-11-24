import "intern";
import { before, beforeEach } from "intern/lib/interfaces/tdd";
import { it } from "intern/lib/interfaces/bdd";
import env from "../../common-backend/env";
import { BotMode } from "../../common/models/system/Strategy";
import { InstanceService } from "../../common-backend/services/InstanceService";
import { RunState } from "../../common/models/system/RunState";
import { addNewBotDefAndInstance, clearTestData, createTestPrice, getTestData, TestDataCtx } from "../utils/test-data";
import { addTestInstance } from "../utils/instances";
import { assert, describe } from "../includes";
import { TEST_DEFAULT_PAIR } from "../constants";


describe(InstanceService.name, () => {

    // Defaults
    const exchange = env.PRIMO_DEFAULT_EXCHANGE;
    const symbolPair = TEST_DEFAULT_PAIR;
    let ctx: TestDataCtx = null;
    let ruid: string = null;
    let workspaceId: string = null;
    let strategyId: string = null;
    let instances = new InstanceService();

    before(async () => {
        ctx = await getTestData();
        ruid = ctx.user.id;
        workspaceId = ctx.workspace.id;
        strategyId = ctx.strategy.id;
    });

    beforeEach(async () => instances = new InstanceService());


    describe(instances.getInstances.name, () => {
        it("correctly returns forward-tests with no orders", async () => {
            await clearTestData();

            // TEST
            const { def, instance, run } = await addTestInstance();

            // TODO: Move these out to tests for addTestInstance
            assert.equal(instance.runState, RunState.NEW);
            assert.equal(instance.modeId, BotMode.FORWARD_TEST);
            assert.isNull(run);

            const descriptors = null;
        });

        it("does not return duplicate entries for multiple runs", async () => {

            //await strats.startBotInstance({ id: instance.id });
            //await strats.stopBotInstance(instance.id);
        })

        it("correctly returns backtests", async () => {
            // TEST
        });

        it("returns the correct number of running bots", async () => {
            // TEST
        });

        it("returns descriptors for bots with no orders", async () => {
            // TEST
        });

        it("handles drawdown correctly", async () => {
            // TEST
        });
    });
});
