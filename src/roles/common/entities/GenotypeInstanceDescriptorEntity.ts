import { ApiTimeResolution } from "../messages/trading";
import { BigNum } from "../numbers";
import { BotMode } from "../models/system/Strategy";
import { GeneticBotFsmState } from "../models/bots/BotState";
import { GenotypeInstanceDescriptor } from "../models/bots/GenotypeInstanceDescriptor";
import { MutableEntity, MutableModel } from "../models/MutableEntity";
import { from } from "../utils/time";


// NOTE: Non-DB entity
export class GenotypeInstanceDescriptorEntity extends MutableEntity implements GenotypeInstanceDescriptor {
    name: string;
    symbols: string;
    modeId: BotMode;
    resId: ApiTimeResolution;
    baseSymbolId: string;
    quoteSymbolId: string;
    genome: string;
    fsmState: GeneticBotFsmState;
    from: Date;
    to: Date;
    duration: object; // Actually a Postgres interval, but not sure if type is public
    numOrders: number;
    totalFees: BigNum;
    totalProfit: BigNum;
    totalProfitPct: number;
    avgProfitPerDay: BigNum;
    avgProfitPctPerDay: number;

    constructor(row?: Partial<GenotypeInstanceDescriptor>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.name = row[prefix + "name"];
            this.symbols = row[prefix + "symbols"];
            this.modeId = row[prefix + "modeId"];
            this.resId = row[prefix + "resId"];
            this.baseSymbolId = row[prefix + "baseSymbolId"];
            this.quoteSymbolId = row[prefix + "quoteSymbolId"];
            this.genome = row[prefix + "genome"];
            this.fsmState = row[prefix + "fsmState"];
            this.from = from(row[prefix + "from"]);
            this.to = from(row[prefix + "to"]);
            this.duration = row[prefix + "duration"];
            this.numOrders = row[prefix + "numOrders"];
            this.totalProfit = BigNum(row[prefix + "totalProfit"]);
            this.totalProfitPct = parseFloat(row[prefix + "totalProfitPct"]);
            this.totalFees = BigNum(row[prefix + "totalFees"]);
            this.avgProfitPerDay = BigNum(row[prefix + "avgProfitPerDay"]);
            this.avgProfitPctPerDay = parseFloat(row[prefix + "avgProfitPctPerDay"]);
        }
    }

    static get cols() {
        return [
            ...MutableEntity.cols,
            "name",
            "symbols",
            "modeId",
            "resId",
            "baseSymbolId",
            "quoteSymbolId",
            "genome",
            "fsmState",
            "from",
            "to",
            "duration",
            "numOrders",
            "totalProfit",
            "totalProfitPct",
            "totalFees",
            "avgProfitPerDay",
            "avgProfitPctPerDay",
        ];
    }

    static fromRow(row?: Partial<GenotypeInstanceDescriptor>, prefix = "") {
        return row ? new GenotypeInstanceDescriptorEntity(row, prefix) : null;
    }
}
