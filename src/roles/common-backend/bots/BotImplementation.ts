import { Knex } from "knex";
import { BotContext } from "./BotContext";
import { OrderStatusUpdateMessage, PriceUpdateMessage } from "../messages/trading";


/**
 * Describes an implementation of a bot.
 */
export interface BotImplementation<TState = unknown> {
    initialize(ctx: BotContext<TState>): Promise<TState>;
    computeIndicatorsForTick(ctx: BotContext<TState>, price: PriceUpdateMessage): Promise<Map<string, unknown>>;
    tick(ctx: BotContext<TState>, price: PriceUpdateMessage, indicators: Map<string, unknown>);
    handleOrderStatusChange(ctx: BotContext<TState>, order: OrderStatusUpdateMessage, trx?: Knex.Transaction): Promise<TState>;
}
