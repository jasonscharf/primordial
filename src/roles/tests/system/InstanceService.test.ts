import "intern";
import { before, beforeEach } from "intern/lib/interfaces/tdd";
import { it } from "intern/lib/interfaces/bdd";
import env from "../../common-backend/env";
import { AddTestInstanceArgs } from "../utils/types";
import { BotMode } from "../../common/models/system/Strategy";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { GenotypeInstanceDescriptor } from "../../common/models/bots/GenotypeInstanceDescriptor";
import { InstanceService, QueryInstancesArgs } from "../../common-backend/services/InstanceService";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { addNewBotDefAndInstance, clearTestData, getTestData, TestDataCtx } from "../utils/test-data";
import { addTestInstance } from "../utils/instances";
import { assert, describe } from "../includes";
import { num, NumLike } from "../../common/numbers";
import { samples } from "../utils/instance-samples";
import { TEST_DEFAULT_ADD_TEST_INSTANCE_ARGS, TEST_DEFAULT_PAIR } from "../constants";
import { isNullOrUndefined } from "../../common/utils";
import { assertDescriptorMatchesInstance, assertNoAction, assertNumsEqual } from "../utils/assertions";



describe(InstanceService.name, () => {

    // Defaults
    const exchange = env.PRIMO_DEFAULT_EXCHANGE;
    const symbolPair = TEST_DEFAULT_PAIR;
    let ctx: TestDataCtx = null;
    let ruid: string = null;
    let workspaceId: string = null;
    let strategyId: string = null;
    let instances = new InstanceService();
    let defaultTestInstanceArgs: Partial<AddTestInstanceArgs> = {
        ruid: null,
    };
    let defaultQueryArgs: QueryInstancesArgs = {
        ruid: null,
    };

    before(async () => {
        ctx = await getTestData();
        ruid = ctx.user.id;
        workspaceId = ctx.workspace.id;
        strategyId = ctx.strategy.id;
        defaultQueryArgs = {
            ruid,
            workspaceId,
            strategyId,
        };
        defaultTestInstanceArgs = {
            ruid,
        };
    });

    beforeEach(async () => instances = new InstanceService());

 
    async function addTestInstanceAndQuery(args: Partial<AddTestInstanceArgs> = {}) {
        const appliedArgs = Object.assign({}, TEST_DEFAULT_ADD_TEST_INSTANCE_ARGS, args);
        const { instance } = await addTestInstance(samples.backTestActiveNoOrders);
        const results = await instances.queryInstances({
            modeFilter: args.modeId || BotMode.BACK_TEST,
        });
        return {
            instance,
            results,
        };
    }

    describe(instances.queryInstances.name, () => {
        describe("bots with no orders", () => {
            it("correctly returns a backtest with no orders", async () => {
                await clearTestData();
                const { instance, results } = await addTestInstanceAndQuery(samples.backtestNew);

                assert.lengthOf(results, 1);
                const [res] = results;
                assertDescriptorMatchesInstance(res, instance);
                assertNoAction(res);
            });

            it("correctly returns a forward-test with no orders", async () => {
                await clearTestData();

                const { instance, results } = await addTestInstanceAndQuery(samples.forwardTestNew);
                assert.lengthOf(results, 1);
                const [res] = results;
                assertDescriptorMatchesInstance(res, instance);
                assertNoAction(res);
            });
        });

        // TODO: TEST: instances created with one pair, e.g. ETH/BTC, with orders from another pair, e.g. BTC/USDT.

        describe("realized profit", async () => {
            it("correctly computes realized profit for a new backtest", async () => {
                await clearTestData();

                const { instance, orders } = await addTestInstance({
                    ...samples.backtestNew,
                    start: false,
                });
                const results = await instances.queryInstances({
                    modeFilter: BotMode.BACK_TEST,
                });
                assert.lengthOf(results, 1);
                const [res] = results;
                assertDescriptorMatchesInstance(res, instance);
                assertNoAction(res);
            });

            it("correctly computes realized profit for a backtest with +10% realized (minus fees)", async () => {
                await clearTestData();

                const { instance, orders } = await addTestInstance(samples.backTestCompletedWithGain10Realized);
                assert.lengthOf(orders, 2);

                const results = await instances.queryInstances({
                    modeFilter: BotMode.BACK_TEST,
                });
                assert.lengthOf(results, 1);

                // Check the stored results
                // NOTE: Assumes using the "summary" path of the query where backtest results come from reports
                const [res] = results;
                assertDescriptorMatchesInstance(res, instance);

                assertNumsEqual(res.numOrders, 2);
                assertNumsEqual(res.totalProfit, 9.79);
                assertNumsEqual(res.totalFees, 0.210); // Buy at 100 = 0.1, sell at 110 = 0.11
                assertNumsEqual(res.totalProfitPct, 0.0979);
                assertNumsEqual(res.avgProfitPerDay, 0.979);
                assertNumsEqual(res.avgProfitPctPerDay, 0.0098);

                assertNumsEqual(res.totalFees.add(res.totalProfit), 10);
            });

            it("correctly computes realized profit for a forward test with +10% realized (minus fees)", async () => {
                await clearTestData();

                const { instance, orders } = await addTestInstance(samples.forwardTestCompletedWithGain10Realized);
                assert.lengthOf(orders, 2);

                const results = await instances.queryInstances({
                    modeFilter: BotMode.FORWARD_TEST,
                });
                assert.lengthOf(results, 1);

                const [res] = results;
                assertDescriptorMatchesInstance(res, instance);

                assertNumsEqual(res.numOrders, 2);
                assertNumsEqual(res.totalProfit, 9.79);
                assertNumsEqual(res.totalFees, 0.210); // Buy at 100 = 0.1, sell at 110 = 0.11
                assertNumsEqual(res.totalProfitPct, 0.0979);
                assertNumsEqual(res.avgProfitPerDay, 0.979);
                assertNumsEqual(res.avgProfitPctPerDay, 0.0098);
            });
            //});
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

        it("returns the correct duration for a backtest", async () => {
        });

        it("returns the correct duration for a backtest with multiple runs", async () => {
        });

        it("returns the correct duration for a forward test", async () => {
        });

        it("returns the correct duration for a forward test with multiple runs", async () => {
        });

        it("handles drawdown correctly", async () => {
            // TEST
        });
    });
});
