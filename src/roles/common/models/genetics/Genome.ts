import { BigNum } from "../../numbers";
import { Chromosome, ChromosomeJson } from "./Chromosome";
import { Gene, GeneJson } from "./Gene";
import { GeneticValueType } from "./GeneticValueType";
import { GenomeParseResult } from "../../../common-backend/genetics/GenomeParseResult";
import { PartialPropSet } from "../../../common/utils/types";
import { PrimoMalformedGenomeError } from "../../errors/errors";
import { TimeResolution } from "../markets/TimeResolution";
import { isNullOrUndefined } from "../../utils";
import { DEFAULT_GENETICS } from "../../../common-backend/genetics/base-genetics";


const compare = (a: string, b: string) => a < b ? -1 : (a > b ? 1 : 0);


export type GenomeJson = { [Property in keyof typeof DEFAULT_GENETICS]: ChromosomeJson };

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

    get activeChromosomes(): Chromosome[] {
        const enabled = new Map<string, Chromosome>();

        const enabledOnBase = !this._base ? [] : this._base.activeChromosomes;
        const uniqueMap = enabledOnBase.concat(Array.from(this._overlaid.entries()).map(([key, value]) => value))
            .filter(chromo => chromo.active)
            .reduce((map, chromo) => {
                map.set(chromo.name, chromo);
                return map;
            }, new Map<string, Chromosome>());


        const unique = Array.from(uniqueMap.values());
        return unique;
    }

    static fromString(str: string, base = defaultBaseGenetics) {
        return new Genome(base, str);
    }

    toString() {
        const pieces: string[] = [];

        const chromos = Array.from(this._overlaid.values())
            .filter(c => c.active)
            .sort((a, b) => compare(a.name, b.name))
            ;

        // Only emit genes for active chromosomes
        for (const chromo of chromos) {
            const genes = Array.from(chromo.genes.values())
                .filter(g => g.active)
                .filter(g => !isNullOrUndefined(g.value))
                //.filter(g => g.value !== g.defaultValue)
                .sort((a, b) => compare(a.name, b.name))
                ;

            // It is possible to have an active chromosome with no active genes.
            // This is useful for activating indicators and using them for viz/research,
            // but not actual signals.
            if (genes.length === 0) {
                pieces.push(chromo.name);
            }
            else {
                pieces.push(...genes.map(gene => `${chromo.name}-${gene.name}=${gene.serialize(gene.value)}`));
            }
        }

        return pieces.join("|");
    }

    toJson() {
        const obj: GenomeJson = {
        };

        const chromos = Array.from(this._overlaid.values())
            .filter(c => c.active)
            .sort((a, b) => compare(a.name, b.name))
            ;

        // Only emit genes for active chromosomes
        for (const chromo of chromos) {
            const genes = Array.from(chromo.genes.values())
                .filter(g => g.active)
                .sort((a, b) => compare(a.name, b.name))
                ;

            const { active, genes: chromoGenes, name } = chromo;

            // It is possible to have an active chromosome with no active gene.
            // This is useful for activating indicators and using them for viz/research,
            // but not actual signals.
            if (genes.length === 0) {
                obj[chromo.name] = {
                    active,
                    name,
                    genes: {},
                };
            }
            else {
                obj[chromo.name] = {
                    active,
                    name,
                    genes: {},
                };

                genes.forEach(gene => {
                    obj[chromo.name].genes[gene.name] = gene.toJson();
                });
            }
        }

        return obj;
    }

    fromJson(json: GenomeJson) {

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
                    copy.value = copy.default;
                }

                //copy.active = true;
                return copy;
            }
        }

        if (!gene && this._base) {
            gene = this._base.getGene<T>(chromosomeName, geneName);
        }

        const copy = gene.copy() as Gene<T>;
        copy.value = copy.default;
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

                // TODO: Think about this more. May be possible to active chromos and
                //  leave some optional genes inactive.
                parsingChromo.genes.forEach(g => g.active = true);
                continue;
            }
            else {
                gene = chromo.getGene(geneName);
                if (!gene) {
                    throw new PrimoMalformedGenomeError(`Unknown gene '${geneName}' in chromosome '${chromosomeName}'`);
                }
            }

            let orig: string = null;

            // Extract value, if present
            if (gene.type == GeneticValueType.FLAG) {
                if (keyValues.length === 1) {
                    parsedValue = true;
                }
                else {
                    orig = keyValues[1].trim();

                    const isTrueFlag = ACCEPTABLE_FLAG_VALUES_FOR_TRUE.indexOf(orig.toLowerCase()) > -1;
                    if (isTrueFlag) {
                        parsedValue = true;
                    }

                    const isFalseFlag = ACCEPTABLE_FLAG_VALUES_FOR_FALSE.indexOf(orig.toLowerCase()) > -1;
                    if (isFalseFlag) {
                        parsedValue = false;
                    }

                    if (parsedValue === null) {
                        throw new PrimoMalformedGenomeError(`Invalid flag value '${orig}' for gene '${geneNameFull}'`);
                    }
                }
            }
            else if (gene.type === GeneticValueType.MONEY) {
                if (keyValues.length === 1) {
                    throw new PrimoMalformedGenomeError(`Missing monetary value for gene '${geneNameFull}'`);
                }
                else {
                    orig = keyValues[1];
                    parsedValue = BigNum(orig);
                }
            }
            else if (gene.type === GeneticValueType.NUMBER || gene.type === GeneticValueType.PERCENT) {
                orig = keyValues[1].trim();
                if (keyValues.length === 1 || isNullOrUndefined(orig)) {
                    throw new PrimoMalformedGenomeError(`Invalid numeric value for gene '${geneNameFull}'`)
                }
                else {
                    parsedValue = parseFloat(orig);
                    if (isNaN(parsedValue as number)) {
                        throw new PrimoMalformedGenomeError(`Invalid numeric value for gene '${geneNameFull}'`);
                    }
                }
            }
            else if (gene.type === GeneticValueType.TIME_RES) {
                orig = keyValues[1].trim();
                if (keyValues.length === 1 || isNullOrUndefined(orig)) {
                    throw new PrimoMalformedGenomeError(`Invalid time resolution value for gene '${geneNameFull}'`)
                }
                else {
                    const ix = ACCEPTABLE_TIME_RES_VALUES.indexOf(orig);
                    if (ix < 0) {
                        throw new PrimoMalformedGenomeError(`Unknown/invalid time resolution '${orig}' for gene '${geneNameFull}'`);
                    }

                    parsedValue = orig as TimeResolution;
                }
            }
            else {
                throw new Error(`Unknown/unsupported gene value type '${gene.type}'`);
            }

            const newGene = new Gene(gene.name, gene.type, gene.default, gene.desc);

            // Specifying a gene makes it active, even if it matches the default
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
