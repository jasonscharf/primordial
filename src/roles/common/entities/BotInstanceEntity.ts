import { BotInstance } from "../models/system/BotInstance";
import { MutableEntity } from "../models/MutableEntity";


export class BotInstanceEntity<T> extends MutableEntity implements BotInstance<T> {
    definitionId: string;
    currentGenome?: string;
    stateJson: T;


    constructor(row?: Partial<BotInstance<T>>) {
        super(row);

        if (row) {
            this.definitionId = row.definitionId;
            this.currentGenome = row.currentGenome;
        }
    }

    static fromRow<T>(row?: Partial<BotInstance<T>>) {
        return row ? new BotInstanceEntity(row) : null;
    }
}
