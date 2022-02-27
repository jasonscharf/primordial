import "intern";
import { before, beforeEach } from "intern/lib/interfaces/tdd";
import { it } from "intern/lib/interfaces/bdd";
import env from "../../common-backend/env";
import { AddTestInstanceArgs } from "../utils/types";
import { BotMode } from "../../common/models/system/Strategy";
import { InstanceSample, samples } from "../utils/instance-samples";
import { InstanceService, QueryInstancesArgs } from "../../common-backend/services/InstanceService";
import { addNewBotDefAndInstance, clearTestData, getTestData, TestDataCtx } from "../utils/test-data";
import { addTestInstance } from "../utils/instances";
import { assert, describe } from "../includes";
import { num, NumLike } from "../../common/numbers";
import { TEST_DEFAULT_PAIR } from "../constants";

import { assertDescriptorMatchesInstance, assertExpected, assertNoAction, assertNumsEqual, assertSample } from "../utils/assertions";



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



    async function addSample(sample: InstanceSample) {
        const { args, expected } = sample;
        const { instance, orders, trades } = await addTestInstance(args);
        return {
            instance,
            orders,
            trades,
        };
    }

    async function addSampleAndQuery(sample: InstanceSample) {
        const { args, expected } = sample;
        const addSampleResults = await addSample(sample);
        const results = await instances.queryInstances({
            modeFilter: args.modeId || BotMode.BACK_TEST,
        });
        return {
            ...addSampleResults,
            results,
        };
    }

    /**
     * Adds a test sample and queries it back. Assumes no pre-existing data.
     * @param name 
     * @param sample 
     */
    function addAndTestSample(name: string, sample: InstanceSample) {
        it(name, async () => {
            await clearTestData();
            const { instance, orders, results, trades } = await addSampleAndQuery(sample);
            assert.lengthOf(results, 1);
            const [d] = results;
            assertDescriptorMatchesInstance(d, instance);
            await assertSample(sample, d, instance);
        });
    }

    describe(instances.queryInstances.name, () => {
        describe("bots with no orders", () => {
            it("correctly returns a new backtest with no orders", async () => {
                await clearTestData();
                const sample = samples.backTestNew;
                const { args, expected } = sample;
                const { instance, results } = await addSampleAndQuery(sample);

                assert.lengthOf(results, 1);
                const [d] = results;
                assertDescriptorMatchesInstance(d, instance);
                await assertSample(sample, d, instance);
            });

            it("correctly returns a new forward test with no orders", async () => {
                await clearTestData();
                const sample = samples.forwardTestNew;
                const { instance, results } = await addSampleAndQuery(sample);

                assert.lengthOf(results, 1);
                const [d] = results;
                assertDescriptorMatchesInstance(d, instance);
                await assertSample(sample, d, instance);
            });

            it("correctly returns an active backtest with no orders", async () => {
                await clearTestData();
                const sample = samples.backTestActiveNoOrders;
                const { args, expected } = sample;
                const { instance, results } = await addSampleAndQuery(sample);

                assert.lengthOf(results, 1);
                const [res] = results;
                assertDescriptorMatchesInstance(res, instance);
                assertNoAction(res);
            });

            it("correctly returns an active forward test with no orders", async () => {
                await clearTestData();
                const sample = samples.forwardTestActiveNoOrders;
                const { instance, results } = await addSampleAndQuery(sample);

                assert.lengthOf(results, 1);
                const [res] = results;
                assertDescriptorMatchesInstance(res, instance);
                assertNoAction(res);
            });
        });

        describe("multiple bots", () => {

        });

        describe("multiple runs", () => {
            it("does not return duplicate entries for multiple runs (backtests)", async () => {

                //await strats.startBotInstance({ id: instance.id });
                //await strats.stopBotInstance(instance.id);
            })
        });

        async function addSamples() {
            const { instance: backtestNew } = await addSample(samples.backTestNew);
            const { instance: backtestActiveNoOrders } = await addSample(samples.backTestActiveNoOrders);
            const { instance: backTestActiveGain10Realized } = await addSample(samples.backTestActiveGain10Realized);

            const { instance: fwdTestNew } = await addSample(samples.forwardTestNew);
            const { instance: fwdTestActiveNoOrders } = await addSample(samples.forwardTestActiveNoOrders);
            const { instance: forwardTestActiveGain10Realized } = await addSample(samples.forwardTestActiveGain10Realized);

            return {
                backtestNew,
                backtestActiveNoOrders,
                backTestActiveGain10Realized,
                fwdTestNew,
                fwdTestActiveNoOrders,
                forwardTestActiveGain10Realized,
            };
        }

        describe("filtering", () => {
            describe("modeFilter", () => {
                it("returns the correct number of backtests", async () => {
                    // TEST
                });

                it("correctly returns backtests when there are multiple backtests and fwd tests", async () => {
                    await clearTestData();
                    await addSamples();

                    const results = await instances.queryInstances({
                        modeFilter: BotMode.BACK_TEST,
                    });

                    assert.lengthOf(results, 3);
                });

                it("returns descriptors for bots with no orders", async () => {
                    // TEST
                });
            });
        });

        describe("duration", () => {
            it("returns the correct duration for a backtest", async () => {
            });

            it("returns the correct duration for a backtest with multiple runs", async () => {
            });

            it("returns the correct duration for a forward test", async () => {
            });

            it("returns the correct duration for a forward test with multiple runs", async () => {
            });
        });

        // TODO: TEST: instances created with one pair, e.g. ETH/BTC, with orders from another pair, e.g. BTC/USDT.

        describe("new bots", async () => {
            describe("no orders", async () => {
                addAndTestSample("no orders (BT)", samples.backTestNew);
                addAndTestSample("no orders (FT)", samples.forwardTestNew);
            });
        });

        describe("active bots", async () => {
            describe("no orders", async () => {
                addAndTestSample("active bot, no orders (BT)", samples.backTestActiveNoOrders);
                addAndTestSample("active bot, no orders (FT)", samples.forwardTestActiveNoOrders);
            });

            describe("realized profit, neutral position", async () => {
                addAndTestSample("active bot, realized profit, neutral position (BT)", samples.backTestCompletedWithGain10Realized);
                addAndTestSample("active bot, realized profit, neutral position (FT)", samples.forwardTestActiveGain10Realized);
            });

            describe("realized profit, unrealized loss", async () => {
                addAndTestSample("active bot, realized profit, unrealized loss (BT)", samples.backTestActiveGain10RealizedLose5);
                addAndTestSample("active bot, realized profit, unrealized loss (FT)", samples.forwardTestActiveGain10RealizedLose5);
            });

            describe("realized profit, unrealized gain", async () => {
                addAndTestSample("active bot, realized profit, unrealized profit (BT)", samples.backTestActiveGain10RealizedGain5);
                addAndTestSample("active bot, realized profit, unrealized profit (FT)", samples.forwardTestActiveGain10RealizedGain5);
            });
        });

        describe("active bots, realized profit, negative position", async () => {

        });

        describe("trailing orders", async () => {
            it("handles drawdown correctly", async () => {
                // TEST
            });
        });
    });
});
