import { BacktestRequest } from "../../common-backend/messages/testing";
import { BotMode } from "../../common/models/system/Strategy";
import { BotType } from "../../common/models/bots/BotType";
import { CacheService } from "../../common-backend/services/CacheService";
import { GenotypeForkArgs, GenotypeService } from "../../common-backend/services/GenotypeService";
import { Genome } from "../../common/models/genetics/Genome";
import { TestDataCtx, getTestData, marketDataSpecimen, clearTestData, TEST_DEFAULT_PAIR } from "../utils/test-data";
import { UserService } from "../../common-backend/services/UserService";
import { assert, describe, before, env, it } from "../includes";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { query } from "../../common-backend/database/utils";
import { sym } from "../../common-backend/services";
import * as specimens from "../utils/data-specimens";
import { TestBacktestForkArgs, backtest, testBacktestFork, testFork, TestForkArgs } from "../utils/runtime";
import { strats } from "../../common-backend/includes";
import { SUPPORTED_TIME_RESOLUTIONS, TimeResolution } from "../../common/models/markets/TimeResolution";
import { genes, names } from "../../common-backend/genetics/base-genetics";
import { MutationSetType } from "../../common/models/genetics/MutationSetType";
import { RunState } from "../../common/models/system/RunState";
import { assertRejects } from "../utils/async";


describe(GenotypeService.name, () => {
    let ctx: TestDataCtx = null;
    let genos: GenotypeService = new GenotypeService();
    let cache = new CacheService();
    let ruid: string = null;

    before(async () => {
        ctx = await getTestData();
        ruid = ctx.user.id;
    });

    beforeEach(async () => {
        genos = new GenotypeService();
    });

    describe(genos.fork.name, () => {
        it("correctly forks a backtest into a forward test", async () => {
            const args: Partial<TestForkArgs> = {
                modeId: BotMode.FORWARD_TEST,
            };

            const { forks, genotypes, genotypesRaw, mutations, mutationSet: set, original } = await testBacktestFork(args);

            assert.exists(set);
            assert.equal(set.ownerId, ruid);
            assert.equal(set.type, MutationSetType.MANUAL_ELEVATE_TO_FWD);

            // Elevating a backtest should return the new instance and genotype
            assert.lengthOf(forks, 1);
            assert.lengthOf(genotypes, 1);
            assert.lengthOf(genotypesRaw, 1);
            assert.lengthOf(mutations, 1);

            assert.ok(forks.every(f => f.modeId === BotMode.FORWARD_TEST), "fork mode is fwd");
            assert.ok(forks.every(f => f.typeId === BotType.DESCENDANT), "fork type is descendant");

            // Backtests not immediately run
            assert.ok(forks.every(f => f.runState === RunState.NEW), "fork run state is new");

            const [fork] = forks;
            assert.equal(fork.modeId, args.modeId);
            assert.equal(fork.runState, RunState.NEW);

            // ... verify genome 

            assert.ok(mutations.every(f => f.msid === set.id), "mutations linked to set");
            assert.ok(mutations.every((f, i) => f.chid === forks[i].id), "mutations linked to forked instances");

            const [mutation] = mutations;
            assert.isNotNull(set.id);
            assert.isNotNull(mutation.msid);
            assert.equal(mutation.msid, set.id);

            return;
        });

        it(`produces backtest mutations of time resolution if specified`, async () => {
            const args: TestBacktestForkArgs = {
                mutations: [
                    genes.META_TR,
                ],
            };

            const { forks, genotypes, genotypesRaw, mutations, mutationSet: set, original } = await testBacktestFork(args);

            const expectedLen = Object.keys(SUPPORTED_TIME_RESOLUTIONS).length;
            assert.lengthOf(forks, expectedLen);
            assert.lengthOf(genotypes, expectedLen);
            assert.lengthOf(genotypesRaw, expectedLen);

            assert.ok(forks.every(f => f.modeId === BotMode.BACK_TEST), "fork mode is backtest");
            assert.ok(forks.every(f => f.typeId === BotType.DESCENDANT), "fork type is descendant");
            assert.ok(forks.every(f => f.runState === RunState.PAUSED), "fork is paused");
            assert.ok(forks.every((f, i) => f.resId === SUPPORTED_TIME_RESOLUTIONS[i]), "forked time res is correct");

            const [mutation] = mutations;
            assert.isNotNull(set.id);
            assert.isNotNull(mutation.msid);
            assert.equal(mutation.msid, set.id);

            return;
        });

        it(`correctly models instance / mutation / set topology`, async () => {
            const args: TestBacktestForkArgs = {
                modeId: BotMode.BACK_TEST,
                mutations: [
                    genes.META_TR,
                ],
            };

            const expectedMutations = 8;
            const { forks: forks1, mutations: m1, mutationSet: set1, original: o1 } = await testBacktestFork(args);
            assert.lengthOf(forks1, expectedMutations);
            const [fork1] = forks1;
            assert.equal(fork1.runState, RunState.PAUSED);

            const { forks: forks2, mutations: m2, mutationSet: set2, original: o2 } = await testBacktestFork({ ...args, parentId: fork1.id });
            assert.lengthOf(forks2, expectedMutations);
            const [fork2] = forks2;
            assert.equal(fork1.runState, RunState.PAUSED);

            const { forks: forks3, mutations: m3, mutationSet: set3, original: o3 } = await testBacktestFork({ ...args, parentId: fork2.id });
            assert.lengthOf(forks3, expectedMutations);
            const [fork3] = forks3;
            assert.equal(fork1.runState, RunState.PAUSED);

            // Forked instances linked to their mutation sets
            assert.isNull(o1.msid);
            assert.equal(fork1.msid, set1.id);
            assert.equal(fork2.msid, set2.id);
            assert.equal(fork3.msid, set3.id);

            // Sets linked to their parent sets
            assert.isNull(set1.psid);
            assert.notEqual(set2.psid, set3.psid);
            assert.equal(set2.psid, set1.id);
            assert.equal(set3.psid, set2.id);

            // Mutations linked to their sets
            assert.ok(m1.every(m => m.msid === set1.id), "mutations linked to set 1");
            assert.ok(m2.every(m => m.msid === set2.id), "mutations linked to set 2");
            assert.ok(m3.every(m => m.msid === set3.id), "mutations linked to set 3");

            // Mutations linked to forked instances
            assert.ok(m1.every((m, i) => forks1.map(f => f.id).includes(m.chid)), "mutations linked to forks");
            assert.ok(m2.every((m, i) => forks2.map(f => f.id).includes(m.chid)), "mutations linked to forks");
            assert.ok(m3.every((m, i) => forks3.map(f => f.id).includes(m.chid)), "mutations linked to forks");
        });

        it(`can produce verbatim mutations`, async () => {
            // TEST: Can manually fork instances with specific mutations
        });

        it("can mutate specific genes", async () => {
            // TEST
        });

        it("can mutate entire chromosomes", async () => {
            // TEST
        });

        it("can only fork in the same strategy (for now)", async () => {
            // TEST
        });

        it(`throws if no mutations and no symbols specified`, async (ctx) => {
            ctx.skip();
            const args: TestBacktestForkArgs = {
                modeId: BotMode.BACK_TEST,
            };

            await assertRejects(() => testBacktestFork(args));
        });

        it("produces the correct number of mutation records for specified mutations", async () => {
            // TEST
        });

        it("produces the correct number of mutation records for overlaid mutations", async () => {
            // TEST
        });

        it("produces the correct number of mutations for each symbol pair", async () => {
            // TEST
        });

        it("throws on missing parentId", async () => {
            // TEST
        });

        it("throws when attempting to elevate a backtest straight to live", async () => {
            // TEST
        });

        it("throws when attemping to fork into a live bot with a test alloc", async () => {
            // TEST
        });

        it("throws when attemping to fork into a live-test bot with a test alloc", async () => {
            // TEST
        });

        it("throws when attemping to fork into a test bot with a live alloc", async () => {
            // TEST
        });

        it("correctly models multiple mutations", async () => {
            // TEST
            // TODO: Ensure that a mutation
        });

        it("correctly forks a forward test into a live bot", async () => {
            // TEST
            // TODO: Ensure that live bots DO NOT tick or place orders
        });
    });
});
