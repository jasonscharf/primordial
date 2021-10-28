import { MutableModel } from "../MutableEntity";


/**
 * Associates a group of mutations.
 */
export interface MutationSet extends MutableModel {
    workspaceId: string;
    strategyId: string;
    ownerId: string;
    system: boolean;

    // Parent Set ID
    psid?: string;

    // Type in DB is string for now
    type: string;

    // Will stick mutation parameters and metadata here for now
    meta: unknown;
}
