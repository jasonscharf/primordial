import { Chromosome } from "../../common/models/genetics/Chromosome";
import { GeneticValueType } from "../../common/models/genetics/GeneticValueType";
import { Genome } from "../../common/models/genetics/Genome";
import { GenomeParseResult } from "./GenomeParseResult";
import { Gene } from "../../common/models/genetics/Gene";
import { Money } from "../../common/numbers";
import { PrimoMalformedGenomeError } from "../../common/errors/errors";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { isNullOrUndefined } from "../../common/utils";
import { DEFAULT_GENETICS } from "./base-genetics";


export const GENOTYPE_SPLIT_EXPR = /[|,]/;
export const GENOTYPE_GENE_SEP_EXPR = /[=]/;
export const ACCEPTABLE_FLAG_VALUES_FOR_TRUE = ["y", "yes", "true"];
export const ACCEPTABLE_FLAG_VALUES_FOR_FALSE = ["n", "no", "false"];
export const ACCEPTABLE_FLAG_VALUES = [
    ...ACCEPTABLE_FLAG_VALUES_FOR_TRUE,
    ...ACCEPTABLE_FLAG_VALUES_FOR_FALSE,
];
export const ACCEPTABLE_TIME_RES_VALUES = Object.keys(TimeResolution).map(k => TimeResolution[k]);

export class GenomeParser {

    /**
     * Parses a raw genotype.
     * @param genomeStr 
     */
    parse(genomeStr: string, base = DEFAULT_GENETICS): GenomeParseResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (genomeStr.trim() === "") {
            warnings.push("Completely empty genome. All defaults will be used.");
            const baseChromos = Object.keys(base).map(k => base[k]);
            const overlaidChromos = [];
            const genome: Genome = new Genome(baseChromos, overlaidChromos);
            return {
                normalizedGenome: "",
                genome,
                errors,
                warnings,
            };
        }

        const rawGenes = genomeStr
            .split(GENOTYPE_SPLIT_EXPR)
            .map(str => str.trim())
            ;

        const specifiedChromos = new Map<string, Chromosome>();

        for (const rawGene of rawGenes) {
            const keyValues = rawGene.split(/=/);
            let parsedValue: unknown = null;
            if (keyValues.length === 0 || keyValues.length > 2) {
                throw new PrimoMalformedGenomeError(`Malformed gene '${rawGene}'; expected a single key/value pair`);
            }

            // No assignment, meaning this is an implicit flag, i.e. "BOLL-B"
            const pieces = keyValues[0].split(/-/);
            const [chromosomeName, ...geneChain] = pieces;

            if (geneChain.some(g => !g)) {
                throw new PrimoMalformedGenomeError(`Invalid gene chain for '${geneChain.join("-")}'`);
            }

            const geneName = geneChain.join("");
            const chromo = base[chromosomeName] as Chromosome;
            if (!chromo) {
                throw new PrimoMalformedGenomeError(`Unknown chromosome '${chromosomeName}'`);
            }

            const gene = chromo.getGene(geneName);
            if (!gene) {
                throw new PrimoMalformedGenomeError(`Unknown gene '${geneName}' in chromosome '${chromosomeName}'`);
            }

            const geneNameFull = `${chromosomeName}-${geneName}`;

            let parsingChromo: Chromosome = null;
            if (!specifiedChromos.has(chromo.name)) {
                parsingChromo = chromo.copy();
                specifiedChromos.set(chromo.name, parsingChromo);
            }
            else {
                parsingChromo = specifiedChromos.get(chromo.name);
            }

            // Extract value, if present
            if (gene.type == GeneticValueType.FLAG) {
                if (keyValues.length === 1) {
                    parsedValue = true;
                }
                else {
                    const rawValue = keyValues[1].trim();
                    let parsedValue: unknown = null;

                    const isTrueFlag = ACCEPTABLE_FLAG_VALUES_FOR_TRUE.indexOf(rawValue.toLowerCase());
                    if (isTrueFlag > 0) {
                        parsedValue = true;
                    }

                    const isFalseFlag = ACCEPTABLE_FLAG_VALUES_FOR_FALSE.indexOf(rawValue.toLowerCase());
                    if (isFalseFlag > 0) {
                        parsedValue = false;
                    }

                    if (parsedValue === null) {
                        throw new PrimoMalformedGenomeError(`Invalid flag value '${rawValue}' for gene '${geneNameFull}'`);
                    }
                }
            }
            else if (gene.type === GeneticValueType.MONEY) {
                if (keyValues.length === 1) {
                    throw new PrimoMalformedGenomeError(`Missing monetary value for gene '${geneNameFull}'`);
                }
                else {
                    const rawValue = keyValues[1];
                    parsedValue = Money(rawValue);
                }
            }
            else if (gene.type === GeneticValueType.NUMBER || gene.type === GeneticValueType.PERCENT) {
                const rawValue = keyValues[1].trim();
                if (keyValues.length === 1 || isNullOrUndefined(rawValue)) {
                    throw new PrimoMalformedGenomeError(`Invalid numeric value for gene '${geneNameFull}'`)
                }
                else {
                    parsedValue = parseFloat(rawValue);
                    if (isNaN(parsedValue as number)) {
                        throw new PrimoMalformedGenomeError(`Invalid numeric value for gene '${geneNameFull}'`);
                    }
                }
            }
            else if (gene.type === GeneticValueType.TIME_RES) {
                const rawValue = keyValues[1].trim();
                if (keyValues.length === 1 || isNullOrUndefined(rawValue)) {
                    throw new PrimoMalformedGenomeError(`Invalid time resolution value for gene '${geneNameFull}'`)
                }
                else {
                    const ix = ACCEPTABLE_TIME_RES_VALUES.indexOf(rawValue);
                    if (ix < 0) {
                        throw new PrimoMalformedGenomeError(`Unknown/invalid time resolution '${rawValue}' for gene '${geneNameFull}'`);
                    }

                    parsedValue = rawValue as TimeResolution;
                }
            }
            else {
                throw new Error(`Unknown/unsupported gene value type '${gene.type}'`);
            }

            const newGene = new Gene(gene.name, gene.type, gene.defaultValue, gene.desc);
            newGene.active = true;
            newGene.value = parsedValue;

            parsingChromo.genes.set(newGene.name, newGene);
            parsingChromo.active = true;
        }

        const baseChromos = Object.keys(base).map(k => base[k]);
        const overlaidChromos = Array.from(specifiedChromos.values());
        const genome: Genome = new Genome(baseChromos, overlaidChromos);
        const normalizedGenome = ""; // TODO

        return {
            normalizedGenome,
            genome,
            errors,
            warnings,
        };
    }
}
