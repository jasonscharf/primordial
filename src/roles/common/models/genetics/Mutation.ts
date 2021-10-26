import { Genome } from "./Genome";
import { ImmutableModel } from "../ImmutableEntity";


export interface Mutation extends ImmutableModel {
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
}
