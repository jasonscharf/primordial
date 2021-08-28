import { MutableModel } from "../MutableEntity";


/**
 * NOTE: These constants are used in the database.
 * DO NOT remove of change values here. Add and deprecate.
 */
export enum Mode {
    BACK_TEST = "test-back",
    FORWARD_TEST = "test-forward",
    LIVE = "live",
    LIVE_TEST = "test-live",

    // Deprecated
    PAUSED = "paused",
}

export interface Strategy extends MutableModel {
    ownerId: string;
    workspaceId: string;
    modeId: Mode;
    name: string;
}
