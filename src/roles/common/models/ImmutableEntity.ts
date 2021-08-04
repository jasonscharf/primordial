import { isNullOrUndefined } from "../utils";


export interface ImmutableModel {
    id: string;

    // NOTE: Used for readability in the database + in UI.
    // Assume users can see all values.
    // Assume English only.
    displayName?: string;
}


/**
 * Represents an immutable entity that is not expected to be updated, e.g.:
 * a historical price, an enumeration value, a static reference value, et cetera.
 */
export class ImmutableEntity implements ImmutableModel {
    id: string;


    constructor(row?: Partial<ImmutableModel>) {
        if (row) {
            this.id = row.id;
        }
    }
}
