import { GenomeParseResult } from "./GenomeParseResult";
import { defaultBaseGenetics, Genome } from "../../common/models/genetics/Genome";


export class GenomeParser {

    /**
     * Parses a raw genotype.
     * @param genomeStr 
     */
    parse(genomeStr: string, base = defaultBaseGenetics): GenomeParseResult {
        return Genome.parse(genomeStr, base);
    }
}
