import { BotMode } from "../system/Strategy";
import { GeneticBotState } from "../../../common-backend/bots/GeneticBot";
import { MutableModel } from "../MutableEntity";
import { RunState } from "../system/RunState";
import { TimeResolution } from "../markets/TimeResolution";


export interface BotInstanceStateInternal {
    baseSymbolId: string;
    quoteSymbolId: string;
}

export interface BotInstance<T = GeneticBotState> extends MutableModel {
    allocationId: string;
    definitionId: string;
    exchangeId: string;
    modeId: BotMode;
    resId: TimeResolution;
    typeId: string;
    name: string;
    type: string;
    build: string,
    prevTick: Date;
    symbols: string;

    // Populated when an instance has a mutation from its base (definition)
    currentGenome?: string;
    normalizedGenome?: string;

    runState: RunState;
    stateInternal: BotInstanceStateInternal;
    stateJson: T;
}
