import { isNullOrUndefined } from "../utils";


export interface MutableModel {
    id: string;
    created: Date;
    updated: Date;

    // NOTE: Used for readability in the database + in UI.
    // Assume users can see all values.
    // Assume English only.
    displayName?: string;
}

/**
 * Represents a model bearing a created and updated timestamp,
 * implying that it can be updated.
 */
export class MutableEntity implements MutableModel {
    id: string;
    created: Date;
    updated: Date;
    displayName?: string;


    constructor(row?: Partial<MutableModel>) {
        if (row) {
            this.id = row.id;
            this.created = row.created;
            this.updated = row.updated;
            this.displayName = isNullOrUndefined(row.displayName) ? "" : row.displayName;
        }
    }
}
