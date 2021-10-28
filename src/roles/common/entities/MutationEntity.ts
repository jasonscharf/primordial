import { ImmutableEntity } from "../models";
import { Mutation } from "../models/genetics/Mutation";


export class MutationEntity extends ImmutableEntity implements Mutation {
    
    // Parent mutation
    msid?: string;
    pid1?: string;
    pid2?: string;
    chid: string;
    raw: string;
    chromo: string;
    gene: string;
    value: string;
    toggle?: boolean;


    constructor(row?: Partial<Mutation>, prefix = "") {
        super(row);

        if (row) {
            this.msid = row[prefix + "msid"];
            this.pid1 = row[prefix + "pid1"];
            this.pid2 = row[prefix + "pid2"];
            this.chid = row[prefix + "chid"];
            this.raw = row[prefix + "raw"];
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
