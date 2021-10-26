import { ImmutableModel } from "../ImmutableEntity";


export interface Mutation extends ImmutableModel {
    setId: string;
    parentId1?: string;
    parentId2?: string;
    childId: string;
    raw: string;
    chromo: string;
    gene: string;
    value: string;
    toggle?: boolean;
}
