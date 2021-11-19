import { ApiTimeResolution } from "../../messages/trading";
import { BigNum } from "../BigNum";
import { BotMode } from "../system/Strategy";
import { Duration } from "../../utils/time";
import { GeneticBotState } from "../../../common-backend/bots/GeneticBot";
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
    state: GeneticBotState;
    genome: string;
    fsmState: GeneticBotFsmState;
    created: Date;
    updated: Date;
    from?: Date;
    to?: Date;
    duration: Duration;
    numOrders: number;
    currentCapital: BigNum;
    totalProfit: BigNum;
    totalProfitPct: number;
    totalFees: BigNum;
    drawdown: BigNum;
    drawdownPct: BigNum;
    avgProfitPerDay: BigNum;
    avgProfitPctPerDay: number;
    prevPrice: BigNum;
    latestPrice: BigNum;
}
