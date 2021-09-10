const talib = require("talib");
import { BotContext } from "../bots/BotContext";
import { Chromosome } from "../../common/models/genetics/Chromosome";
import { GeneticBotState } from "../../worker/bots/GeneticBot";
import { Price } from "../../common/models/markets/Price";
import { PriceUpdateMessage } from "../messages/trading";


/**
 * A Chromosome bound to an indicator from TA-lib.
 */
export abstract class IndicatorChromosome<T = number> extends Chromosome {

    /**
     * Computes current values for the indicator
     * @param ctx 
     * @returns 
     */
    abstract compute(ctx: BotContext<GeneticBotState>, tick: Price): Promise<T>;

    /**
     * Computes a buy/sell signal.
     * @param ctx 
     * @param price 
     * @param values 
     */
    abstract computeBuySellSignal(ctx: BotContext<GeneticBotState>, price: PriceUpdateMessage, values: unknown): Promise<number>;

    /**
     * Retrieves configured buy/sell weights for this indicator.
     * @param ctx 
     */
    abstract getBuySellWeights(ctx: BotContext<GeneticBotState>): [number, number];
}
