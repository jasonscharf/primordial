import { BotDefinition } from "../common/models/bots/BotDefinition";
import { BotMode } from "../common/models/system/Strategy";
import { BotInstance } from "../common/models/bots/BotInstance";
import { RunState } from "../common/models/system/RunState";
import { env } from "./includes";
import { AddTestInstanceArgs, TestingRunArgs } from "./utils/types";



export const TEST_DEFAULT_BASE = "BTC";
export const TEST_DEFAULT_QUOTE = "USDT";
export const TEST_DEFAULT_PAIR = `${TEST_DEFAULT_BASE}/${TEST_DEFAULT_QUOTE}`;
export const TEST_DEFAULT_BUDGET = `10000 ${TEST_DEFAULT_QUOTE}`;


export const DEFAULT_TEST_BACKTEST_ARGS: TestingRunArgs = {
    genotype: "RSI-L=45|RSI-H=46",
    budget: TEST_DEFAULT_BUDGET,
};

export const TEST_DEFAULT_NEW_BOT_DEF_PROPS: Partial<BotDefinition> = {
    description: "test",
    genome: "BBBBO",
    symbols: "ETH/BTC",
    displayName: "test",
    name: "test",
};

export const TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS: Partial<BotInstance> = {
    runState: RunState.NEW,
    modeId: BotMode.FORWARD_TEST,
    exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
    currentGenome: "BBBBO",
};

export const TEST_DEFAULT_ADD_TEST_INSTANCE_ARGS: Partial<AddTestInstanceArgs> = {
    existingAllocationId: null,
    budget: "1000 USDT",
    start: false,
    modeId: BotMode.FORWARD_TEST,
};
