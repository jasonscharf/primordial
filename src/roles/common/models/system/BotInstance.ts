import { TimeResolution } from "../markets/TimeResolution";
import { Mode } from "./Strategy";
import { MutableModel } from "../MutableEntity";
import { RunState } from "./RunState";


export interface BotInstanceStateInternal {
    baseSymbolId: string;
    quoteSymbolId: string;
}

export interface BotInstance<T = unknown> extends MutableModel {
    allocationId: string;
    definitionId: string;
    modeId: Mode;
    resId: TimeResolution;
    exchangeId: string;
    name: string;
    type: string;
    build: string,
    prevTick: Date;
    symbols: string;

    // Populated when an instance has a mutation from its base (definition)
    currentGenome?: string;

    runState: RunState;
    stateInternal: BotInstanceStateInternal;
    stateJson: T;
}
