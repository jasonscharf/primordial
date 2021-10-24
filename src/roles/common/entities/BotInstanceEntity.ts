import { BotInstance, BotInstanceStateInternal } from "../models/bots/BotInstance";
import { BotMode } from "../models/system/Strategy";
import { BotType } from "../models/bots/BotType";
import { GeneticBotState } from "../../common-backend/bots/GeneticBot";
import { MutableEntity } from "../models/MutableEntity";
import { RunState } from "../models/system/RunState";
import { TimeResolution } from "../models/markets/TimeResolution";


/**
 * Represents a stored bot and its current state.
 */
export class BotInstanceEntity<T = GeneticBotState> extends MutableEntity implements BotInstance<T> {
    allocationId: string;
    definitionId: string;
    exchangeId: string;
    modeId: BotMode;
    resId: TimeResolution;
    typeId: BotType;
    runState: RunState;
    name: string;
    build: string;
    type: string;
    prevTick: Date;
    symbols: string;
    currentGenome?: string;
    normalizedGenome?: string;
    stateInternal: BotInstanceStateInternal;
    stateJson: T;


    constructor(row?: Partial<BotInstance<T>>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.allocationId = row[prefix + "allocationId"];
            this.definitionId = row[prefix + "definitionId"];
            this.exchangeId = row[prefix + "exchangeId"];
            this.modeId = row[prefix + "modeId"];
            this.resId = row[prefix + "resId"];
            this.typeId = row[prefix + "typeId"];
            this.runState = row[prefix + "runState"];
            this.name = row[prefix + "name"];
            this.build = row[prefix + "build"];
            this.type = row[prefix + "type"];
            this.prevTick = row[prefix + "prevTick"];
            this.symbols = row[prefix + "symbols"];
            this.currentGenome = row[prefix + "currentGenome"];
            this.normalizedGenome = row[prefix + "normalizedGenome"];
            this.stateInternal = row[prefix + "stateInternal"];
            this.stateJson = row[prefix + "stateJson"];
        }
    }

    static get cols() {
        return [
            ...MutableEntity.cols,
            "allocationId",
            "definitionId",
            "currentGenome",
            "modeId",
            "resId",
            "name",
            "symbols",
            "type",
            "prevTick",
            "build",
            "runState",
            "stateJson",
            "stateInternal",
        ];
    }

    static fromRow<T = GeneticBotState>(row?: Partial<BotInstance<T>>, prefix = "") {
        return row ? new BotInstanceEntity(row, prefix) : null;
    }
}
