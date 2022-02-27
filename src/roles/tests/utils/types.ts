import { BotMode } from "../../common/models/system/Strategy";
import { GeneticBotState } from "../../common-backend/bots/GeneticBot";
import { GenotypeInstanceDescriptor } from "../../common/models/bots/GenotypeInstanceDescriptor";
import { Order } from "../../common/models/markets/Order";
import { RunState } from "../../common/models/system/RunState";


export interface TestingRunArgs {
    genotype: string,
    budget?: string,
}

export interface AddTestInstanceArgs {
    ruid?: string;
    existingAllocationId?: string;
    budget?: string;
    start?: boolean;
    stop?: boolean;
    modeId?: BotMode;
    runState?: RunState;
    runFrom?: Date;
    runTo?: Date;
    orders?: Partial<Order>[];
    state?: Partial<GeneticBotState>;
}


