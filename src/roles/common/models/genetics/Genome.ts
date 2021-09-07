import { Chromosome } from "./Chromosome";
import { Gene } from "./Gene";
import { DEFAULT_GENETICS } from "../../../common-backend/genetics/base-genetics";


/**
 * Represents the genetic material of a bot or strategy.
 */
export class Genome {
    protected _baseChromosomes = new Map<string, Chromosome>();
    protected _overlaidChromosomes = new Map<string, Chromosome>();
    

    get chromosomesEnabled() {
        return Array.from(this._overlaidChromosomes.values());
    }

    get chromosomesAll() {
        return Array.from(this._baseChromosomes.values());
    }

    getGene<T>(chromosomeName: string, geneName: string): Gene<T> {
        if (!this._baseChromosomes.has(chromosomeName)) {
            return null;
        }

        const baseChromosome = this._baseChromosomes.get(chromosomeName);
        const baseGene = baseChromosome.getGene(geneName);

        if (this._overlaidChromosomes.has(chromosomeName)) {
            const overlaidChromosome = this._overlaidChromosomes.get(chromosomeName);
            const overlaidGene = overlaidChromosome.getGene(geneName);
            if (overlaidGene) {
                const copy = overlaidGene.copy() as Gene<T>;
                if (!copy.value) {
                    copy.value = copy.defaultValue;
                }

                return copy;
            }
        }

        const copy = baseGene.copy() as Gene<T>;
        copy.value = copy.defaultValue;
        return copy;
    }

    constructor(baseChromosomes: Chromosome[], overlaidChromosomes: Chromosome[]) {
        for (const chromo of baseChromosomes) {
            this._baseChromosomes.set(chromo.name, chromo);
        }
        for (const chromo of overlaidChromosomes) {
            this._overlaidChromosomes.set(chromo.name, chromo);
        }
    }
}
