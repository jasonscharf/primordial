import { MutableEntity } from "../models/MutableEntity";
import { Plan, PlanMode } from "../models/system/Plan";

export class PlanEntity extends MutableEntity implements Plan {
    modeId: PlanMode;
    workspaceId: string;


    constructor(row?: Partial<Plan>) {
        super(row);

        if (row) {
            this.modeId = row.modeId;
            this.workspaceId = row.workspaceId;
        }
    }

    static fromRow(row?: Partial<Plan>) {
        return row ? new PlanEntity(row) : null;
    }
}
