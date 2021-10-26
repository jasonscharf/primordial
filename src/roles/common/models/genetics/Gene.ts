import { isNullOrUndefined } from "../../utils";
import { GeneticValueType } from "./GeneticValueType";


export interface GeneJson<T = unknown> {
    name: string;
    active: boolean;
    value: T;
    default?: T;
    orig: string;
}

/**
 * Describes a particular gene in a chromosome, controlling some aspect of a bot's operation.
 */
export class Gene<T = unknown> {
    name: string;
    desc: string;
    default: T;
    type: GeneticValueType;
    active = false;
    value: T = null;
    orig: string;


    constructor(name: string, type: GeneticValueType, defaultValue: T, desc: string) {
        this.name = name;
        this.default = defaultValue;
        this.desc = desc;
        this.type = type;
    }

    copy() {
        const gene = new Gene(this.name, this.type, this.default, this.desc);
        gene.value = this.value;
        gene.active = this.active;
        return gene;
    }

    serialize<T>(value: T) {
        let valueOrDefault = isNullOrUndefined(value) ? this.default : value;

        // Use Y or N for flags
        if (this.type === GeneticValueType.FLAG) {
            return this.value ? "Y" : "N";
        }

        // Explicitly string numbers for high precision
        else if (this.type === GeneticValueType.NUMBER) {

            // The nulldef is in case we don't have an orig value.
            return parseFloat(isNullOrUndefined(this.orig) ? value.toString() : this.orig);
        }

        else {
            // Null values in genotype declarations are disallowed
            return (this.orig ?? value.toString());
        }
    }


    toJson(): GeneJson {
        return {
            name: this.name,
            active: this.active,
            value: this.value,
            default: this.default,
            orig: this.orig,
        };
    }

    static fromJson(obj: GeneJson) {
        return
    }
}
