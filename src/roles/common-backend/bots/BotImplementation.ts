import { Knex } from "knex";
import { BotContext } from "./BotContext";
import { GeneticBotFsmState } from "../../common/models/bots/BotState";
import { GeneticBotState } from "./GeneticBot";
import { OrderStatusUpdateMessage, PriceUpdateMessage } from "../messages/trading";


/**
 * Describes an implementation of a bot.
 */
export interface BotImplementation<TState = GeneticBotState> {
    initialize(ctx: BotContext<TState>): Promise<TState>;
    changeFsmState(ctx: BotContext<TState>, state: TState, newFsmState: GeneticBotFsmState): TState;
    computeIndicatorsForTick(ctx: BotContext<TState>, tick: PriceUpdateMessage): Promise<Map<string, unknown>>;
    computeSignal(ctx: BotContext<TState>, tick: PriceUpdateMessage, indicators: Map<string, unknown>): Promise<number>;
    tick(ctx: BotContext<TState>, tick: PriceUpdateMessage, signal: number, indicators: Map<string, unknown>);
    handleOrderStatusChange(ctx: BotContext<TState>, order: OrderStatusUpdateMessage, trx?: Knex.Transaction): Promise<TState>;
}
