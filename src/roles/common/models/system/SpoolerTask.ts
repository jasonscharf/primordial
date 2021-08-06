import { MutableModel } from "../MutableEntity";


export interface SpoolerTask<TState = unknown> extends MutableModel {
    name: string;
    prevRun?: Date;
    nextRun?: Date;
    lastError?: string;
    frequencySeconds?: number;
    state?: TState;
    isRunning: boolean;
    runCount: number;
}
