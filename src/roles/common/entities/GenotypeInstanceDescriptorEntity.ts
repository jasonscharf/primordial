import { ApiTimeResolution } from "../messages/trading";
import { BigNum } from "../numbers";
import { BotMode } from "../models/system/Strategy";
import { Duration, from } from "../utils/time";
import { GeneticBotFsmState } from "../models/bots/BotState";
import { GenotypeInstanceDescriptor } from "../models/bots/GenotypeInstanceDescriptor";
import { MutableEntity, MutableModel } from "../models/MutableEntity";
import { GeneticBotState } from "../../common-backend/bots/GeneticBot";


// NOTE: Non-DB entity
export class GenotypeInstanceDescriptorEntity extends MutableEntity implements GenotypeInstanceDescriptor {
    name: string;
    symbols: string;
    modeId: BotMode;
    resId: ApiTimeResolution;
    baseSymbolId: string;
    quoteSymbolId: string;
    state: GeneticBotState;
    genome: string;
    fsmState: GeneticBotFsmState;
    from: Date;
    to: Date;
    duration: Duration;
    numOrders: number;
    currentCapital: BigNum;
    totalFees: BigNum;
    totalProfit: BigNum;
    totalProfitPct: number;
    drawdown: BigNum;
    drawdownPct: BigNum;
    avgProfitPerDay: BigNum;
    avgProfitPctPerDay: number;
    prevPrice: BigNum;
    latestPrice: BigNum;


    constructor(row?: Partial<GenotypeInstanceDescriptor>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.name = row[prefix + "name"];
            this.symbols = row[prefix + "symbols"];
            this.modeId = row[prefix + "modeId"];
            this.resId = row[prefix + "resId"];
            this.baseSymbolId = row[prefix + "baseSymbolId"];
            this.quoteSymbolId = row[prefix + "quoteSymbolId"];
            this.state = row[prefix + "state"];
            this.genome = row[prefix + "genome"];
            this.fsmState = row[prefix + "fsmState"];
            this.from = from(row[prefix + "from"]);
            this.to = from(row[prefix + "to"]);
            this.duration = row[prefix + "duration"];
            this.numOrders = row[prefix + "numOrders"];
            this.currentCapital = BigNum(row[prefix + "currentCapital"] ?? "0");
            this.totalProfit = BigNum(row[prefix + "totalProfit"]);
            this.totalProfitPct = parseFloat(row[prefix + "totalProfitPct"]);
            this.totalFees = BigNum(row[prefix + "totalFees"]);
            this.drawdown = BigNum(row[prefix + "drawdown"] ?? "0");
            this.drawdownPct = BigNum(row[prefix + "drawdownPct"] ?? "0");
            this.avgProfitPerDay = BigNum(row[prefix + "avgProfitPerDay"]);
            this.avgProfitPctPerDay = parseFloat(row[prefix + "avgProfitPctPerDay"]);
            this.prevPrice = BigNum(row[prefix + "prevPrice"] ?? "0");
            this.latestPrice = BigNum(row[prefix + "latestPrice"] ?? "0");
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
            "state",
            "genome",
            "fsmState",
            "from",
            "to",
            "duration",
            "numOrders",
            "currentCapital",
            "totalProfit",
            "totalProfitPct",
            "totalFees",
            "drawdown",
            "drawdownPct",
            "avgProfitPerDay",
            "avgProfitPctPerDay",
        ];
    }

    static fromRow(row?: Partial<GenotypeInstanceDescriptor>, prefix = "") {
        return row ? new GenotypeInstanceDescriptorEntity(row, prefix) : null;
    }
}
