export interface GeneticParseOptions {
    singleFragmentOnly: boolean;
    allowValues?: boolean;
    allowMutationSpecifiers?: boolean;
}

export const DEFAULT_GENE_PARSE_OPTIONS: GeneticParseOptions = {
    allowValues: true,
    allowMutationSpecifiers: false,
    singleFragmentOnly: false,
};

export interface GeneticParseResult<T = unknown> {
    chromo: string;
    gene?: string;
    orig: string;
    value?: T;
}
