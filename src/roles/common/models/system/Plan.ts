import { MutableModel } from "../MutableEntity";


export enum PlanMode {
    BACK_TEST = "test-back",
    FORWARD_TEST = "test-forward",
    LIVE = "live",
    LIVE_TEST = "test-live",
    PAUSED = "paused",
}

export interface Plan extends MutableModel {
    workspaceId: string;
    modeId: PlanMode;
}
