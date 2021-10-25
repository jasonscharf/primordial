import { Knex } from "knex";
import { BotContext, botIdentifier } from "./BotContext";
import { BotImplementation } from "./BotImplementation";
import { GeneticBotFsmState } from "../../common/models/bots/BotState";
import { GeneticBotState } from "./GeneticBot";
import { OrderStatusUpdateMessage, PriceUpdateMessage } from "../messages/trading";


/**
 * Base implementation of a box exposing configurable genetics.
 */
export class BotImplementationBase<TState = GeneticBotState> implements BotImplementation<TState> {

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
     * Mutates a bot's FSM state, and tracks the state change.
     * @param ctx 
     * @param newFsmState 
     * @returns 
     */
    changeFsmState(ctx: BotContext<TState>, state: TState, newFsmState: GeneticBotFsmState): TState {
        // TODO: Clean up this bunk typing; just make all bots genetic bot state bearing
        const genState = state as any as GeneticBotState;
        const { log } = ctx as any as BotContext<GeneticBotState>;
        const currState = genState.fsmState;

        if (newFsmState !== currState) {
            genState.prevFsmState = currState;
            genState.prevFsmStateChangeTs = new Date();
            genState.fsmState = newFsmState;

            if (ctx.instance.modeId !== "test-back") {
                log.info(`Bot '${botIdentifier(ctx.instance)}' changes state from '${genState.prevFsmState}' to '${genState.fsmState}'`);
            }
        }

        ctx.state = state;
        return genState as any as TState;
    }

    /**
     * Computes/updates any active indicators for the current frame, storing their values.
     * @param ctx
     * @param price
     */
    async computeIndicatorsForTick(ctx: BotContext<TState>, price: PriceUpdateMessage): Promise<Map<string, unknown>> {
        const { state } = ctx;
        return new Map<string, unknown>();
    }

    /**
     * Computes the current buy/sell signal.
     * @param ctx 
     * @param tick 
     * @param indicators 
     * @returns 
     */
    async computeSignal(ctx: BotContext<TState>, tick: PriceUpdateMessage, indicators: Map<string, unknown>): Promise<number> {
        const { state } = ctx;
        return 0;
    }

    /**
     * Ticks a bot.
     * Note that ticks may come at any time, different exchange/symbol combinations are updated at different freqs.
     * @param ctx
     * @param tick
     * @param signal
     * @param indicators
     */
    async tick(ctx: BotContext<TState>, price: PriceUpdateMessage, signal: number, indicators: Map<string, unknown>): Promise<TState> {
        const { instance, state } = ctx;
        ctx.log.debug(`[BOT] ${botIdentifier(instance)} ticks...`);
        return state;
    }

    /**
     * Handle order completion for entry/exit, stop-loss/take-profit.
     * @param ctx 
     * @param order 
     */
    async handleOrderStatusChange(ctx: BotContext<TState>, order: OrderStatusUpdateMessage, trx?: Knex.Transaction): Promise<TState> {
        const { instance, state } = ctx;
        ctx.log.info(`[BOT] Handles order status change`, order);
        return state;
    }
}
