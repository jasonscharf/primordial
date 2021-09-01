import { PriceUpdateMessage } from "../messages/trading";
import { BotContext } from "./BotContext";


/**
 * Describes an implementation of a bot.
 */
export interface BotImplementation<TState = unknown> {
    initialize(ctx: BotContext<TState>): Promise<TState>;
    computeIndicatorsForTick(ctx: BotContext<TState>, price: PriceUpdateMessage): Promise<Map<string, unknown>>;
    tick(ctx: BotContext<TState>, price: PriceUpdateMessage, indicators: Map<string, unknown>);
}
