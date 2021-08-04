import { BotDefinition } from "../models/system/BotDefinition";
import { MutableEntity } from "../models/MutableEntity";


export class BotDefinitionEntity extends MutableEntity implements BotDefinition {
    workspaceId: string;
    genome: string;
    description?: string;


    constructor(row?: Partial<BotDefinition>) {
        super(row);

        if (row) {
            this.workspaceId = row.workspaceId;
            this.genome = row.genome;
            this.description = row.description;
        }
    }

    static fromRow(row?: Partial<BotDefinitionEntity>) {
        return row ? new BotDefinitionEntity(row) : null;
    }
}
