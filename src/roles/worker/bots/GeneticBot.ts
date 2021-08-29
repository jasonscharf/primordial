import { BotContext } from "../../common-backend/bots/BotContext";
import { BotImplementationBase } from "../../common-backend/bots/BotImplementationBase";
import { PriceUpdateMessage } from "../../common-backend/messages/trading";


export interface GeneticBotState {

}


/**
 * Basic genetic bot, configured entirely via genome.
 */
export class GeneticBot extends BotImplementationBase<GeneticBotState> {
    async computeIndicatorsForTick(ctx: BotContext<GeneticBotState>, price: PriceUpdateMessage): Promise<GeneticBotState> {
        const { state } = ctx;
        return state;
    }

    async tick(ctx: BotContext, price: PriceUpdateMessage) {
        const { instance, log, state } = ctx;
        const { close } = price;
        const { currentGenome } = instance;

        log.info(`GeneticBot with genome '${currentGenome}' ticks @ '${close}'`);
        
        return state;
    }
}
