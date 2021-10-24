import { ApiTimeResolution } from "../../messages/trading";
import { BigNum } from "../BigNum";
import { MutableModel } from "../MutableEntity";
import { GeneticBotFsmState } from "./BotState";


// Not a DB entity
export interface GenotypeInstanceDescriptor extends MutableModel {
    id: string;
    name: string;
    symbols: string;
    resId: ApiTimeResolution;
    baseSymbolId: string;
    quoteSymbolId: string;
    genome: string;
    fsmState: GeneticBotFsmState;
    created: Date;
    updated: Date;
    duration: object; // Actually a Postgres interval, but not sure if type is public
    numOrders: number;
    totalProfit: BigNum;
    totalFees: BigNum;
    avgProfitPerDay: BigNum;
    avgProfitPctPerDay: number;
}
