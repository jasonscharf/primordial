import { Genome } from "../../common/models/genetics/Genome";


/**
 * Results of parsing a genome, including validation messages.
 */
export interface GenomeParseResult {
    genome: Genome;
    normalizedGenome: string;
    warnings: string[];
    errors: string[];
}
