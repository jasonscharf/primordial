import { ImmutableEntity } from "../models";
import { GenomeParser } from "../../common-backend/genetics/GenomeParser";
import { Genome } from "../models/genetics/Genome";
import { Mutation } from "../models/genetics/Mutation";


export class MutationEntity extends ImmutableEntity implements Mutation {
    setId: string;
    parentId1: string;
    parentId2?: string;
    childId: string;
    overlay: Genome;
    gen: number;
    desc: string;
    chromo: string;
    gene?: string;
    value?: string;
    toggle?: boolean;


    constructor(row?: Partial<Mutation>, prefix = "") {
        super(row);

        if (row) {
            this.setId = row[prefix + "setId"];
            this.parentId1 = row[prefix + "parentId1"];
            this.parentId2 = row[prefix + "parentId2"];
            this.childId = row[prefix + "childId"];
            this.overlay = row[prefix + "overlay"] ? (new GenomeParser().parse(row[prefix + "overlay"]).genome) : null;
            this.gen = row[prefix + "gen"];
            this.desc = row[prefix + "desc"];
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
