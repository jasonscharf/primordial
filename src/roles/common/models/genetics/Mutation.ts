import { ImmutableModel } from "../ImmutableEntity";


export interface Mutation extends ImmutableModel {

    // Instance parents
    pid1?: string;

    // Mutation Set ID: If non-null, references the mutation set this instance was derived from
    msid?: string;

    chid: string;
    raw: string;
    chromo: string;
    gene: string;
    value: string;
    toggle?: boolean;
}
