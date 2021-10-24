import { ApiTimeResolution } from "../../messages/trading";
import { BigNum } from "../BigNum";
import { BotMode } from "../system/Strategy";
import { GeneticBotFsmState } from "./BotState";
import { MutableModel } from "../MutableEntity";


// Not a DB entity
export interface GenotypeInstanceDescriptor extends MutableModel {
    id: string;
    name: string;
    symbols: string;
    resId: ApiTimeResolution;
    baseSymbolId: string;
    quoteSymbolId: string;
    modeId: BotMode;
    genome: string;
    fsmState: GeneticBotFsmState;
    created: Date;
    updated: Date;
    from?: Date;
    to?: Date;
    duration: object; // Actually a Postgres interval, but not sure if type is public
    numOrders: number;
    totalProfit: BigNum;
    totalFees: BigNum;
    avgProfitPerDay: BigNum;
    avgProfitPctPerDay: number;
}
