import { MutableEntity } from "../models/MutableEntity";
import { Strategy, Mode } from "../models/system/Strategy";


export class StrategyEntity extends MutableEntity implements Strategy {
    ownerId: string;
    workspaceId: string;
    modeId: Mode;
    name: string;


    constructor(row?: Partial<Strategy>) {
        super(row);

        if (row) {
            this.ownerId = row.ownerId;
            this.workspaceId = row.workspaceId;
            this.modeId = row.modeId;
            this.name = row.name;
        }
    }

    static fromRow(row?: Partial<Strategy>) {
        return row ? new StrategyEntity(row) : null;
    }
}
