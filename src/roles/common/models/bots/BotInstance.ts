
import { Mode } from "../system/Strategy";
import { MutableModel } from "../MutableEntity";
import { TimeResolution } from "../markets/TimeResolution";
import { RunState } from "../system/RunState";


export interface BotInstanceStateInternal {
    baseSymbolId: string;
    quoteSymbolId: string;
}

export interface BotInstance<T = unknown> extends MutableModel {
    allocationId: string;
    definitionId: string;
    exchangeId: string;
    modeId: Mode;
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
