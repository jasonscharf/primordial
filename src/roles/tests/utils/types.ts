import { BotMode } from "../../common/models/system/Strategy";


export interface TestingRunArgs {
    genotype: string,
    budget?: string,
}

export interface AddTestInstanceArgs {
    existingAllocationId?: string;
    budget?: string;
    start?: boolean;
    modeId?: BotMode;
}

