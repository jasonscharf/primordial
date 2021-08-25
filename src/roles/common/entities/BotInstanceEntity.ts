import { BotInstance, BotInstanceStateInternal } from "../models/system/BotInstance";
import { MutableEntity } from "../models/MutableEntity";
import { Mode } from "../models/system/Strategy";
import { RunState } from "../models/system/RunState";
import { TimeResolution } from "../models/markets/TimeResolution";


/**
 * Represents a stored bot and its current state.
 */
export class BotInstanceEntity<T> extends MutableEntity implements BotInstance<T> {
    allocationId: string;
    definitionId: string;
    exchangeId: string;
    modeId: Mode;
    resId: TimeResolution;
    runState: RunState;
    name: string;
    build: string;
    type: string;
    prevTick: Date;
    symbols: string;
    currentGenome?: string;
    stateInternal: BotInstanceStateInternal;
    stateJson: T;


    constructor(row?: Partial<BotInstance<T>>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.allocationId = row[prefix + "allocationId"];
            this.definitionId = row[prefix + "definitionId"];
            this.exchangeId = row[prefix + "exchangeId"];
            this.modeId = row[prefix + "modeId"];
            this.runState = row[prefix + "runState"];
            this.resId = row[prefix + "resId"];
            this.name = row[prefix + "name"];
            this.build = row[prefix + "build"];
            this.type = row[prefix + "type"];
            this.prevTick = row[prefix + "prevTick"];
            this.symbols = row[prefix + "symbols"];
            this.currentGenome = row[prefix + "currentGenome"];
            this.stateInternal = row[prefix + "stateInternal"];
            this.stateJson = row[prefix + "stateJson"];
        }
    }

    static fromRow<T>(row?: Partial<BotInstance<T>>, prefix = "") {
        return row ? new BotInstanceEntity(row, prefix) : null;
    }
}
