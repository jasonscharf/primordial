import { MutableModel } from "../MutableEntity";


export interface BotInstance<T> extends MutableModel {
    definitionId: string;

    // Populated when an instance has a mutation from its base (definition)
    currentGenome?: string;

    stateJson: T;
}
