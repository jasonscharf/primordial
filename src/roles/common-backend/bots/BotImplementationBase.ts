import { Order } from "../../common/models/markets/Order";
import { PriceUpdateMessage } from "../messages/trading";
import { BotContext, botIdentifier } from "./BotContext";
import { BotImplementation } from "./BotImplementation";


/**
 * Base implementation of a box exposing configurable genetics.
 */
export class BotImplementationBase<TState = unknown> implements BotImplementation<TState> {

    /**
     * Initializes a newly running bot.
     * @param state 
     * @param InternalBotInstanceStateInternal 
     */
    async initialize(ctx: BotContext<TState>): Promise<TState> {
        const { instance } = ctx;
        ctx.log.info(`[BOT] ${botIdentifier(instance)} initializes`);
        ctx.log.debug(`[BOT] State is ${ctx.state}`);
        return <TState><any>{
            initialized: true,
        };
    }

    /**
     * Computes/updates any active indicators for the current frame, storing their values.
     * @param ctx
     * @param price
     */
    async computeIndicatorsForTick(ctx: BotContext<TState>, price: PriceUpdateMessage): Promise<TState> {
        const { state } = ctx;
        return state;
    }

    /**
     * Ticks a bot.
     * Note that ticks may come at any time, different exchange/symbol combinations are updated at different freqs.
     * @param ctx
     * @param price
     */
    async tick(ctx: BotContext<TState>, price: PriceUpdateMessage): Promise<TState> {
        const { instance, state } = ctx;
        ctx.log.debug(`[BOT] ${botIdentifier(instance)} ticks...`);
        return state;
    }

    /**
     * Handle order completion for entry/exit, stop-loss/take-profit.
     * @param ctx 
     * @param order 
     */
    async handleOrderStatusChange(ctx: BotContext<TState>, order: Order): Promise<Order> {
        ctx.log.info(`[BOT] Handles order status change`, order);
        return null;
    }
}
