import { BacktestRequest } from "../../common-backend/messages/testing";
import { BotMode } from "../../common/models/system/Strategy";
import { BotType } from "../../common/models/bots/BotType";
import { CacheService } from "../../common-backend/services/CacheService";
import { GenotypeForkArgs, GenotypeService } from "../../common-backend/services/GenotypeService";
import { Genome } from "../../common/models/genetics/Genome";
import { TestDataCtx, getTestData, marketDataSpecimen, clearTestData } from "../utils/test-data";
import { UserService } from "../../common-backend/services/UserService";
import { assert, describe, before, env, it } from "../includes";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { query } from "../../common-backend/database/utils";
import { sym } from "../../common-backend/services";
import * as specimens from "../utils/data-specimens";
import { backtest, testFork, TestForkArgs, TestingRunArgs } from "../utils/runtime";
import { strats } from "../../common-backend/includes";


describe(GenotypeService.name, () => {
    let ctx: TestDataCtx = null;
    let genos: GenotypeService = new GenotypeService();
    let cache = new CacheService();

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(async () => {
        genos = new GenotypeService();
    });

    describe(genos.fork.name, () => {
        it("correctly forks a backtest into a forward test", async () => {
            const specimen = specimens.random.btcUsdt1HourOctober2021;
            await clearTestData();

            const genome = "HA";
            const { instanceId } = await backtest(specimen, { genotype: genome });
            const mutations = [];

            const args: TestForkArgs = {
                parentId: instanceId,
                specimen,
                modeId: BotMode.FORWARD_TEST,
                typeId: BotType.DESCENDANT, // TODO: mutation type
            };

            const { forks } = await testFork(args);
            
            return;
        });

        it("can only fork in the same strategy (for now)", async () => {

        });

        it("sets the correct generation ID and parent link", async () => {
            // TEST
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

        });

        it("throws when attemping to fork into a live bot with a test alloc", async () => {
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
