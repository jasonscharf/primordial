import { Knex } from "knex";
import { BotContext } from "./BotContext";
import { OrderStatusUpdateMessage, PriceUpdateMessage } from "../messages/trading";


/**
 * Describes an implementation of a bot.
 */
export interface BotImplementation<TState = unknown> {
    initialize(ctx: BotContext<TState>): Promise<TState>;
    computeIndicatorsForTick(ctx: BotContext<TState>, tick: PriceUpdateMessage): Promise<Map<string, unknown>>;
    computeSignal(ctx: BotContext<TState>, tick: PriceUpdateMessage, indicators: Map<string, unknown>): Promise<number>;
    tick(ctx: BotContext<TState>, tick: PriceUpdateMessage, signal: number, indicators: Map<string, unknown>);
    handleOrderStatusChange(ctx: BotContext<TState>, order: OrderStatusUpdateMessage, trx?: Knex.Transaction): Promise<TState>;
}
