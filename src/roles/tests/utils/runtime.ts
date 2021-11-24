import { ApiForkGenotypeRequest } from "../../common/messages";
import { BacktestRequest } from "../../common-backend/messages/testing";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotMode } from "../../common/models/system/Strategy";
import { BotRunner } from "../../common-backend/bots/BotRunner";
import { BotRunReport } from "../../common/models/bots/BotSummaryResults";
import { BotType } from "../../common/models/bots/BotType";
import { Genome } from "../../common/models/genetics/Genome";
import { GenomeParser } from "../../common-backend/genetics/GenomeParser";
import { GeneticBotState } from "../../common-backend/bots/GeneticBot";
import { GenotypeForkArgs } from "../../common-backend/services/GenotypeService";
import { MarketDataSpecimen } from "./data-specimens";
import { Mutation } from "../../common/models/genetics/Mutation";
import { MutationSet } from "../../common/models/genetics/MutationSet";
import { TestingRunArgs } from "./types";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { capital, genos, strats } from "../../common-backend/includes";
import { randomName } from "../../common-backend/utils/names";
import { DEFAULT_ALLOCATION_MAX_WAGER } from "../../common-backend/constants";
import { getTestData } from "./test-data";
import * as specimens from "./data-specimens";
import { DEFAULT_TEST_BACKTEST_ARGS, TEST_DEFAULT_PAIR } from "../constants";



export async function backtest(specimen: MarketDataSpecimen, args: TestingRunArgs): Promise<BotRunReport> {
    const appliedArgs = Object.assign({}, DEFAULT_TEST_BACKTEST_ARGS, args);
    let { budget, genotype: genome } = appliedArgs;

    const parsedBudget = await capital.parseAssetAmounts(budget);
    const req: BacktestRequest = {
        name: randomName(),
        genome,
        res: specimen.res,
        from: specimen.from,
        to: specimen.to,
        budget: parsedBudget,
        maxWagerPct: DEFAULT_ALLOCATION_MAX_WAGER,
        symbols: specimen.symbolPair,
        returnEarly: false,
        remove: false,
    };

    //const ctx = buildBacktestingContext(def, instance, run);
    const runner = new BotRunner();
    const results = await runner.run(req) as BotRunReport;
    return results;
}


export interface TestBacktestForkArgs extends Partial<TestForkArgs> {
    genotype?: string;
}

export interface TestForkArgs extends Partial<GenotypeForkArgs> {
    parentId: string;
    requestingUserId?: string;
    specimen: MarketDataSpecimen;
}

export interface TestForkResult {
    original: BotInstance;
    forks: BotInstance[];
    genotypes: Genome[];
    genotypesRaw: string[];
    mutations: Mutation[];
    mutationSet: MutationSet;
}


export const TEST_DEFAULT_FORK_ARGS: Partial<GenotypeForkArgs> = {
    modeId: BotMode.BACK_TEST,
    typeId: BotType.DESCENDANT,
    mutations: [],
    symbolPairs: [TEST_DEFAULT_PAIR],
    res: TimeResolution.ONE_HOUR,
}

export async function testFork(args: TestForkArgs): Promise<TestForkResult> {
    const appliedArgs = Object.assign({}, TEST_DEFAULT_FORK_ARGS, args);
    const testDataCtx = await getTestData();

    let { requestingUserId, strategyId, workspaceId } = appliedArgs;
    requestingUserId = requestingUserId || testDataCtx.user.id;
    strategyId = strategyId || testDataCtx.strategy.id;
    workspaceId = workspaceId || testDataCtx.workspace.id;

    const { maxWagerPct, modeId, mutations: suppliedMutations, overlayMutations, parentId, specimen, typeId } = appliedArgs;
    const parent = await strats.getBotInstanceById(parentId);
    const def = await strats.getBotDefinitionById(testDataCtx.workspace.id, parent.definitionId);

    const forkArgs: GenotypeForkArgs = {
        parentId,
        allocationId: parent.allocationId,
        res: specimen.res,
        mutations: suppliedMutations,
        strategyId,
        symbolPairs: [parent.symbols],
        overlayMutations,
        workspaceId,
        modeId,
        typeId,
        maxWagerPct,
        system: false,
    };

    const fork = await genos.fork(requestingUserId, forkArgs);
    const { ids, mutations, mutationSet } = fork;

    const forks = await strats.getBotInstancesByIds(requestingUserId, workspaceId, strategyId, ids);


    const parser = new GenomeParser();
    const genotypes = forks
        .map(fork => parser.parse(fork.currentGenome))
        .map(pr => pr.genome)
        ;

    const genotypesRaw = genotypes
        .map(genotype => genotype.toString())
        ;

    const result: TestForkResult = {
        original: parent,
        forks,
        mutations,
        mutationSet,
        genotypes,
        genotypesRaw,
    };

    return result;
}

const TEST_DEFAULT_BACK_TEST_SPECIMEN = specimens.random.btcUsdt1HourOctober2021;
const TEST_DEFAULT_BACK_TEST_GENOTYPE = "HA";
const TEST_DEFAULT_BACK_TEST_ARGS: Partial<TestBacktestForkArgs> = {
    specimen: TEST_DEFAULT_BACK_TEST_SPECIMEN,
    modeId: BotMode.BACK_TEST,
    typeId: BotType.DESCENDANT,
    genotype: TEST_DEFAULT_BACK_TEST_GENOTYPE,
    mutations: [],
    system: false,
};

export async function testBacktestFork(args: Partial<TestBacktestForkArgs>): Promise<TestForkResult> {
    const appliedArgs = Object.assign({}, TEST_DEFAULT_BACK_TEST_ARGS, args);
    const { genotype, specimen } = appliedArgs;

    // Only backtest if no parent assigned
    if (!appliedArgs.parentId) {
        const { instanceId: parentId } = await backtest(specimen, { genotype });
        appliedArgs.parentId = parentId;
    }
    return await testFork(appliedArgs as TestForkArgs);
}
