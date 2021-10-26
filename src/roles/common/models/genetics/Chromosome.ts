import { Gene, GeneJson } from "./Gene";
import { GeneticValueType } from "./GeneticValueType";
import { TimeResolution } from "../markets/TimeResolution";


const UNKNOWN = "unknown";

export interface ChromosomeJson {
    name: string;
    active: boolean;
    genes: { [key: string]: GeneJson };
}

/**
 * Describes a group of related genes, e.g. an "RSI" chromosome bearing "RSI-L" and "RSI-H" genes.
 * 
 */
export class Chromosome {
    genes = new Map<string, Gene>();
    name = UNKNOWN;
    title = UNKNOWN;
    desc = "";
    active = false;


    constructor(name: string, title: string, desc: string, genes: Gene[] = []) {
        this.name = name;
        this.title = title;
        this.desc = desc;

        for (const gene of genes) {
            this.genes.set(gene.name, gene);
        }
    }

    toJson(activeGenesOnly = true): ChromosomeJson {
        const obj: ChromosomeJson = {
            name: this.name,
            active: this.active,
            genes: {}
        };
        const genes = Array.from(this.genes.values())
        .filter(g => !activeGenesOnly || g.active)
        .forEach(gene => {
            obj.genes[gene.name] = gene.toJson();
        });

        return obj;
    }

    /**
     * Copies this chromosome and all of its genes
     * @returns 
     */
    copy() {
        const genes = Array.from(this.genes.entries())
            .map(([k, gene]) => gene.copy())
            .reduce((map, gene) => {
                map.set(gene.name, gene);
                return map;
            }, new Map<string, Gene>())
            ;

        const newChromo = Object.create(Object.getPrototypeOf(this));
        newChromo.name = this.name;
        newChromo.title = this.title;
        newChromo.desc = this.desc;
        newChromo.genes = genes;
        newChromo.active = Array.from(genes.values()).some(g => g.active);
        return newChromo;
    }

    /**
     * Gets a gene by name. Throws if it does not exist.
     * @param name 
     */
    getGene<T>(name: string): Gene<T> {
        if (!this.genes.has(name)) {
            throw new Error(`Missing gene '${name}' in chromosome '${this.name}'`);
        }

        return this.genes.get(name) as Gene<T>;
    }
}
