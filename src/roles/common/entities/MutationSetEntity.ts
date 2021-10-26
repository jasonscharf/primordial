import { Mutation } from "../models/genetics/Mutation";
import { MutableEntity } from "../models";
import { MutationSet } from "../models/genetics/MutationSet";


export class MutationSetEntity extends MutableEntity implements MutationSet {
    workspaceId: string;
    strategyId: string;
    ownerId: string;
    desc: string;
    system: boolean;
    meta: unknown;


    constructor(row?: Partial<MutationSet>, prefix = "") {
        super(row);

        if (row) {
            this.workspaceId = row[prefix + "workspaceId"];
            this.strategyId = row[prefix + "strategyId"];
            this.ownerId = row[prefix + "ownerId"];
            this.desc = row[prefix + "desc"];
            this.system = row[prefix + "system"];
            this.meta = row[prefix + "meta"];
        }
    }

    static fromRow(row?: Partial<Mutation>) {
        return row ? new MutationSetEntity(row) : null;
    }
}
