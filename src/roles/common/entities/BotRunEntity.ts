import { BotRun } from "../models/system/BotRun";
import { MutableEntity } from "../models/MutableEntity";


export class BotRunEntity extends MutableEntity implements BotRun {
    instanceId: string;
    active: boolean;


    constructor(row?: Partial<BotRun>, prefix = "") {
        super(row);

        if (row) {
            this.instanceId = row[prefix + "instanceId"];
            this.active = row[prefix + "active"];
        }
    }

    static fromRow(row?: Partial<BotRun>) {
        return row ? new BotRunEntity(row) : null;
    }
}
