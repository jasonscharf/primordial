import { ApiTimeResolution } from "../../messages/trading";
import { BigNum } from "../BigNum";
import { GeneticBotFsmState } from "./BotState";


export interface RunningBotDescriptor {
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
    computedProfit: BigNum;
    computedFees: BigNum;
}
