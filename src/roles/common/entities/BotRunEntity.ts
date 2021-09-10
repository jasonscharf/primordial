import { BotRun } from "../models/bots/BotRun";
import { MutableEntity } from "../models/MutableEntity";


export class BotRunEntity extends MutableEntity implements BotRun {
    instanceId: string;
    active: boolean;
    from: Date;
    to: Date;


    constructor(row?: Partial<BotRun>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.instanceId = row[prefix + "instanceId"];
            this.active = row[prefix + "active"];
            this.from = row[prefix + "from"];
            this.to = row[prefix + "to"];
        }
    }

    static get cols() {
        return [
            ...MutableEntity.cols,
            "instanceId",
            "active",
        ];
    }

    static fromRow(row?: Partial<BotRun>, prefix = "") {
        return row ? new BotRunEntity(row, prefix) : null;
    }
}
