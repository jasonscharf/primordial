import { BotRun } from "../models/system/BotRun";
import { MutableEntity } from "../models/MutableEntity";


export class BotRunEntity extends MutableEntity implements BotRun {
    instanceId: string;


    constructor(row?: Partial<BotRun>) {
        super(row);

        if (row) {
            this.instanceId = row.instanceId;
        }
    }

    static fromRow(row?: Partial<BotRun>) {
        return row ? new BotRunEntity(row) : null;
    }
}
