import { AddTestInstanceArgs, TestingRunArgs } from "./utils/types";
import { BigNum } from "../common/numbers";
import { BotDefinition } from "../common/models/bots/BotDefinition";
import { BotInstance } from "../common/models/bots/BotInstance";
import { BotMode } from "../common/models/system/Strategy";
import { RunState } from "../common/models/system/RunState";
import { env } from "./includes";
import { from } from "../common/utils/time";


export const TEST_DEFAULT_BASE = "BTC";
export const TEST_DEFAULT_QUOTE = "USDT";
export const TEST_DEFAULT_PAIR = `${TEST_DEFAULT_BASE}/${TEST_DEFAULT_QUOTE}`;
export const TEST_DEFAULT_BUDGET = `10000 ${TEST_DEFAULT_QUOTE}`;
export const TEST_DEFAULT_ORDER_CAPITAL = BigNum("100");

// Default run is 10 days from Jan 1 2021
export const TEST_DEFAULT_RUN_FROM = from("2021-01-01T00:00:00Z");
export const TEST_DEFAULT_RUN_TO = from("2021-01-10T23:59:59.999Z");

export const DEFAULT_TEST_BACKTEST_ARGS: TestingRunArgs = {
    genotype: "RSI-L=45|RSI-H=46",
    budget: TEST_DEFAULT_BUDGET,
};

export const TEST_DEFAULT_NEW_BOT_DEF_PROPS: Partial<BotDefinition> = {
    description: "test",
    genome: "BBBBO",
    symbols: TEST_DEFAULT_PAIR,
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
    runFrom: TEST_DEFAULT_RUN_FROM,
    runTo: TEST_DEFAULT_RUN_TO,
    start: true,
};
