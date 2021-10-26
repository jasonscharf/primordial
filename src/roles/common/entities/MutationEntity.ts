import { ImmutableEntity } from "../models";
import { Mutation } from "../models/genetics/Mutation";


export class MutationEntity extends ImmutableEntity implements Mutation {
    setId: string;
    parentId1?: string;
    parentId2?: string;
    childId: string;
    raw: string;
    chromo: string;
    gene: string;
    value: string;
    toggle?: boolean;


    constructor(row?: Partial<Mutation>, prefix = "") {
        super(row);

        if (row) {
            this.setId = row[prefix + "setId"];
            this.parentId1 = row[prefix + "parentId1"];
            this.parentId2 = row[prefix + "parentId2"];
            this.childId = row[prefix + "childId"];
            this.raw = row[prefix + "overlayRaw"];
            this.chromo = row[prefix + "chromo"];
            this.gene = row[prefix + "gene"];
            this.value = row[prefix + "value"];
            this.toggle = row[prefix + "toggle"];
        }
    }

    static fromRow(row?: Partial<Mutation>) {
        return row ? new MutationEntity(row) : null;
    }
}
