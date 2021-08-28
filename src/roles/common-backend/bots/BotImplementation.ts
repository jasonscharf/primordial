import { BotContext } from "./BotContext";


/**
 * Describes an implementation of a bot.
 */
export interface BotImplementation<TState = unknown> {
    initialize(ctx: BotContext<TState>): Promise<TState>;
    computeIndicatorsForTick(ctx: BotContext<TState>): Promise<TState>;
    tick(ctx: BotContext<TState>);
}
