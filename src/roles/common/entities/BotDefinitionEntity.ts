import { BotDefinition } from "../models/system/BotDefinition";
import { MutableEntity } from "../models/MutableEntity";


export class BotDefinitionEntity extends MutableEntity implements BotDefinition {
    workspaceId: string;
    name: string;
    symbols: string;
    genome: string;
    normalizedGenome: string;
    description?: string;


    constructor(row?: Partial<BotDefinition>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.workspaceId = row[prefix + "workspaceId"];
            this.name = row[prefix + "name"];
            this.symbols = row[prefix + "symbols"];
            this.genome = row[prefix + "genome"];
            this.normalizedGenome = row[prefix + "normalizedGenome"];
            this.description = row[prefix + "description"];
        }
    }

    static fromRow(row?: Partial<BotDefinitionEntity>, prefix ="") {
        return row ? new BotDefinitionEntity(row, prefix) : null;
    }
}
