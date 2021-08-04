import { MutableEntity } from "../models/MutableEntity";
import { Workspace } from "../models/system/Workspace";
import { isNullOrUndefined } from "../utils";


export class WorkspaceEntity extends MutableEntity implements Workspace {
    ownerId: string;
    description?: string;


    constructor(row?: Partial<Workspace>) {
        super(row);

        if (row) {
            this.ownerId = row.ownerId;
            this.description = isNullOrUndefined(row) ? "" : row.description;
        }
    }

    static fromRow(row?: Partial<Workspace>) {
        return row ? new WorkspaceEntity(row) : null;
    }
}
