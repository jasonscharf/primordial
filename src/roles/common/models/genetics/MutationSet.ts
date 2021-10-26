import { MutableModel } from "../MutableEntity";


/**
 * Associates a group of mutations.
 */
export interface MutationSet extends MutableModel {
    workspaceId: string;
    strategyId: string;
    ownerId: string;
    desc: string;
    system: boolean;

    // Will stick mutation parameters and metadata here for now
    meta: unknown;
}
