import { buildBacktestingContext } from "../../common-backend/bots/BotContext";
import { BotRunner } from "../../common-backend/bots/BotRunner";
import { GeneticBotState } from "../../common-backend/bots/GeneticBot";
import { DEFAULT_ALLOCATION_MAX_WAGER } from "../../common-backend/constants";
import { GenomeParser } from "../../common-backend/genetics/GenomeParser";
import { capital, genos, strats } from "../../common-backend/includes";
import { BacktestRequest } from "../../common-backend/messages/testing";
import { GenotypeForkArgs } from "../../common-backend/services/GenotypeService";
import { randomName } from "../../common-backend/utils/names";
import { ApiForkGenotypeRequest } from "../../common/messages";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotRunReport } from "../../common/models/bots/BotSummaryResults";
import { BotType } from "../../common/models/bots/BotType";
import { Genome } from "../../common/models/genetics/Genome";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { BotMode } from "../../common/models/system/Strategy";
import { MarketDataSpecimen } from "./data-specimens";
import { TEST_DEFAULT_PAIR, getTestData, TEST_DEFAULT_BUDGET } from "./test-data";


export interface TestingRunArgs {
    genotype: string,
    budget?: string,
}

export const DEFAULT_TEST_BACKTEST_ARGS: TestingRunArgs = {
    genotype: "RSI-L=45|RSI-H=46",
    budget: TEST_DEFAULT_BUDGET,
};


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

export interface TestForkArgs extends Partial<GenotypeForkArgs> {
    parentId: string;
    requestingUserId?: string;
    specimen: MarketDataSpecimen;
}

export interface TestForkResult {
    original: BotInstance;
    forks: BotInstance[];
    genotypes: Genome[];
    genotypesRaw: string[]
}


export const TEST_DEFAULT_FORK_ARGS: Partial<GenotypeForkArgs> = {
    modeId: BotMode.BACK_TEST,
    typeId: BotType.DESCENDANT,
    mutations: [],
    overlayMutations: false,
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

    const { maxWagerPct, modeId, mutations, overlayMutations, parentId, specimen, typeId } = appliedArgs;
    const parent = await strats.getBotInstanceById(parentId);
    const def = await strats.getBotDefinitionById(testDataCtx.workspace.id, parent.definitionId);

    const forkArgs: GenotypeForkArgs = {
        parentId,
        allocationId: parent.allocationId,
        res: specimen.res,
        mutations,
        strategyId,
        symbolPairs: [parent.symbols],
        overlayMutations,
        workspaceId,
        modeId,
        typeId,
        maxWagerPct,
    };

    const fork = await genos.fork(forkArgs);
    const { ids } = fork;

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
        genotypes,
        genotypesRaw,
    };

    return result;
}
