import { GeneticValueType } from "./GeneticValueType";


/**
 * Describes a particular gene in a chromosome, controlling some aspect of a bot's operation.
 */
export class Gene<T = unknown> {
    name: string;
    desc: string;
    defaultValue: T;
    type: GeneticValueType;
    active = false;
    value: T = null;



    constructor(name: string, type: GeneticValueType, defaultValue: T, desc: string) {
        this.name = name;
        this.defaultValue = defaultValue;
        this.desc = desc;
        this.type = type;
    }

    copy() {
        const gene = new Gene(this.name, this.type, this.defaultValue, this.desc);
        gene.value = this.value;
        return gene;
    }
}
