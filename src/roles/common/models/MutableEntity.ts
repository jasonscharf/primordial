import { from } from "../utils/time";
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


    constructor(row?: Partial<MutableModel>, prefix = "") {
        if (row) {
            this.id = row[prefix + "id"];
            this.created = from(row[prefix + "created"]);
            this.updated = from(row[prefix + "updated"]);
            this.displayName = isNullOrUndefined(row[prefix + "displayName"]) ? "" : row[prefix + "displayName"];
        }
    }

    static get cols() {
        return [
            "id",
            "created",
            "updated",
            "displayName",
        ];
    }
}
