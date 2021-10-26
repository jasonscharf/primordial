import { BigNum } from "../../numbers";
import { Chromosome } from "./Chromosome";
import { Gene } from "./Gene";
import { GeneticValueType } from "./GeneticValueType";
import { GenomeParseResult } from "../../../common-backend/genetics/GenomeParseResult";
import { PrimoMalformedGenomeError } from "../../errors/errors";
import { TimeResolution } from "../markets/TimeResolution";
import { isNullOrUndefined } from "../../utils";
import { DEFAULT_GENETICS } from "../../../common-backend/genetics/base-genetics";



/**
 * Represents the genetic material of a bot or strategy.
 */
export class Genome {
    protected _base: Genome = null;
    protected _overlaid = new Map<string, Chromosome>();


    constructor(base?: Genome, overlaid?: string | Chromosome[]) {
        this._base = base || null;

        if (typeof overlaid === "string") {
            const { genome: parsed } = Genome.parse(overlaid);
            this.overlay(parsed.overlaidChromosomes);
        }
        else {
            if (overlaid) {
                this.overlay(overlaid);
            }
        }
    }

    get overlaidChromosomes(): Chromosome[] {
        return Array.from(this._overlaid.values());
    }

    get overlaid(): Genome {
        return new Genome(null, this.overlaidChromosomes);
    }

    get chromosomesAll(): Chromosome[] {
        const enabled = new Map<string, Chromosome>();

        const baseChromos = !this._base ? [] : this._base.chromosomesAll;
        const uniqueMap = baseChromos.concat(Array.from(this._overlaid.entries()).map(([key, value]) => value))
            .reduce((map, chromo) => {
                map.set(chromo.name, chromo);
                return map;
            }, new Map<string, Chromosome>());

        const unique = Array.from(uniqueMap.values());
        return unique;
    }

    get chromosomesEnabled(): Chromosome[] {
        const enabled = new Map<string, Chromosome>();

        const enabledOnBase = !this._base ? [] : this._base.chromosomesEnabled;
        const uniqueMap = enabledOnBase.concat(Array.from(this._overlaid.entries()).map(([key, value]) => value))
            .filter(chromo => chromo.active)
            .reduce((map, chromo) => {
                map.set(chromo.name, chromo);
                return map;
            }, new Map<string, Chromosome>());


        const unique = Array.from(uniqueMap.values());
        return unique;
    }

    setChromosome(chromo: Chromosome, freeze = false) {
        if (!freeze) {
            this._overlaid.set(chromo.name, chromo.copy());
        }
        else {
            this._overlaid.set(chromo.name, Object.freeze(chromo.copy()));
        }
    }

    /*
    get chromosomesAll() {
        return Array.from(this._baseChromosomes.values());
    }*/

    overlay(overlay: Chromosome[]) {
        overlay.forEach(chromo => this.setChromosome(chromo));
    }

    copyWithMutation<T>(chromo: string, gene: string, value: T): Genome {
        const copy: Genome = new Genome(this._base, this.overlaidChromosomes);
        copy.setGene(chromo, gene, value);

        return copy;
    }

    setGene<T>(chromoName: string, geneName: string, value: T): Gene<T> {
        let chromo: Chromosome;

        // If we've already overlaid this chromosome, use it
        if (this._overlaid.has(chromoName)) {
            chromo = this._overlaid.get(chromoName);
        }
        // If it only exists in the case, copy so we can set the gene
        else if (this._base.has(chromoName)) {
            chromo = this._base.getChromo(chromoName);
            chromo = chromo.copy();
            this._overlaid.set(chromoName, chromo);
        }
        else {
            throw new Error(`Unknown chromosme/gene pair '${chromoName}-${geneName}'`);
        }

        const gene = chromo.getGene<T>(geneName);
        if (!gene) {
            throw new Error(`Unknown chromosme/gene pair '${chromoName}-${geneName}'`);
        }

        chromo.active = true;
        gene.value = value;
        gene.active = true;
        return gene;
    }

    getChromo(chromoName: string): Chromosome {
        if (this._overlaid.has(chromoName)) {
            return this._overlaid.get(chromoName);
        }
        else if (this._base && this._base.has(chromoName)) {
            return this._base.getChromo(chromoName);
        }
        else {
            throw new Error(`Unknown chromosome '${chromoName}'`);
        }
    }

    getGene<T>(chromosomeName: string, geneName: string): Gene<T> {
        let gene: Gene<T>;
        if (this._overlaid.has(chromosomeName)) {
            const overlaidChromosome = this._overlaid.get(chromosomeName);
            gene = overlaidChromosome.getGene(geneName);
            if (gene) {
                const copy = gene.copy() as Gene<T>;
                if (!copy.value) {
                    copy.value = copy.defaultValue;
                }

                //copy.active = true;
                return copy;
            }
        }

        if (!gene && this._base) {
            gene = this._base.getGene<T>(chromosomeName, geneName);
        }

        const copy = gene.copy() as Gene<T>;
        copy.value = copy.defaultValue;
        return copy;
    }

    has(chromoName: string): boolean {
        if (this._overlaid.has(chromoName)) {
            return true;
        }
        else if (this._base && this._base.has(chromoName)) {
            return true;
        }
    }

    /**
   * Parses a raw genotype.
   * @param genomeStr 
   */
    static parse(genomeStr: string, base = defaultBaseGenetics): GenomeParseResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (genomeStr.trim() === "") {
            warnings.push("Completely empty genome. All defaults will be used.");
            const baseChromos = Object.keys(base).map(k => base[k]);
            const overlaidChromos = [];
            const genome: Genome = new Genome(base, overlaidChromos);
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
            const chromo = base.getChromo(chromosomeName);
            if (!chromo) {
                throw new PrimoMalformedGenomeError(`Unknown chromosome '${chromosomeName}'`);
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

            let gene: Gene;

            if (keyValues.length === 1) {
                parsingChromo.active = true;
                parsingChromo.genes.forEach(g => g.active = true);
                continue;
            }
            else {
                gene = chromo.getGene(geneName);
                if (!gene) {
                    throw new PrimoMalformedGenomeError(`Unknown gene '${geneName}' in chromosome '${chromosomeName}'`);
                }
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
                    parsedValue = BigNum(rawValue);
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

        const overlaidChromos = Array.from(specifiedChromos.values());
        const genome: Genome = new Genome(base, overlaidChromos);
        const normalizedGenome = ""; // TODO

        return {
            normalizedGenome,
            genome,
            errors,
            warnings,
        };
    }
}


export const GENOTYPE_SPLIT_EXPR = /[|,]/;
export const GENOTYPE_GENE_SEP_EXPR = /[=]/;
export const ACCEPTABLE_FLAG_VALUES_FOR_TRUE = ["y", "yes", "true"];
export const ACCEPTABLE_FLAG_VALUES_FOR_FALSE = ["n", "no", "false"];
export const ACCEPTABLE_FLAG_VALUES = [
    ...ACCEPTABLE_FLAG_VALUES_FOR_TRUE,
    ...ACCEPTABLE_FLAG_VALUES_FOR_FALSE,
];
export const ACCEPTABLE_TIME_RES_VALUES = Object.keys(TimeResolution).map(k => TimeResolution[k]);



export const defaultBaseGenetics: Genome = new Genome(null);
for (const chromoName of Object.keys(DEFAULT_GENETICS)) {
    defaultBaseGenetics.setChromosome(DEFAULT_GENETICS[chromoName], true);
}
