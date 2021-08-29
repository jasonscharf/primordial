import env from "../env";
import { BotDefinition } from "../../common/models/system/BotDefinition";
import { BotInstance, BotInstanceStateInternal } from "../../common/models/system/BotInstance";
import { BotRun } from "../../common/models/system/BotRun";
import { Genome } from "../../common/models/genetics/Genome";
import { GenomeParser } from "../genetics/GenomeParser";
import { Logger } from "../../common/utils/Logger";
import { Order, OrderState } from "../../common/models/markets/Order";
import { OrderDelegateArgs } from "./BotOrderDelegate";
import { Mode } from "../../common/models/system/Strategy";
import { log, orders } from "../includes";



/**
 * Runtime context for a bot implementation.
 */
export interface BotContext<TState = unknown> {
    def: BotDefinition;
    instance: BotInstance;
    genome: Genome;
    runId: string;
    state: TState;
    stateInternal: BotInstanceStateInternal;
    log: Logger;

    placeLimitBuyOrder(ctx: BotContext, args: OrderDelegateArgs): Promise<Order>;
    placeLimitSellOrder(ctx: BotContext, args: OrderDelegateArgs): Promise<Order>;
    placeStopLoss(ctx: BotContext, args: OrderDelegateArgs): Promise<Order>;
    cancelAllOrders(ctx: BotContext, args: OrderDelegateArgs): Promise<Order[]>;
}

/**
 * Displays a bot's name and ID. Useful for logging purposes.
 * @param bot 
 * @returns 
 */
export function botIdentifier(bot: BotInstance) {
    return `${bot.name} (${bot.id.substr(0, 8)})`;
}

/**
 * Builds the appropriate bot context for a bot, e.g. a context for backtesting when backtesting,
 * or a live context for production.
 * @param def 
 * @param record 
 * @returns 
 */
export async function buildBotContext(def: BotDefinition, record: BotInstance, run: BotRun): Promise<BotContext> {
    const { genome } = new GenomeParser().parse(record.currentGenome);
    const ctx: Partial<BotContext> = {
        def,
        instance: record,
        genome,
        state: record.stateJson,
        stateInternal: record.stateInternal,
        log,
    };

    // Give the bot the facilities it needs based on its mode, e.g. back-testing

    ctx.placeLimitBuyOrder = async (ctx, args, del?) => {
        debugger;

        const { instance } = ctx;
        const { exchange, market, price, quantity } = args;
        const { id: botRunId } = run;
        const { baseSymbolId, quoteSymbolId } = ctx.stateInternal;

        const order: Partial<Order> = {
            displayName: `TODO`, // TODO
            exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
            baseSymbolId,
            quoteSymbolId,
            botRunId,
            extOrderId: "TEST",
            strike: price,
            quantity,
            stateId: OrderState.OPEN,
        };

        // ... place order goes here
        if (record.modeId === Mode.LIVE || record.modeId === Mode.LIVE_TEST) {

            //
            // TODO: Place actual order ... use delegate
            //
        }

        const savedOrder = await orders.addOrderToDatabase(order);

        log.debug(`Bot places BUY order`, savedOrder);
        debugger;

        return savedOrder;
    };

    //
    ctx.placeLimitSellOrder = async (ctx, args, del?) => {
        const { exchange, market, price, quantity } = args;
        const { id: botRunId } = run;
        const { baseSymbolId, quoteSymbolId } = ctx.stateInternal;

        // TODO: Commission, OrderFills

        const order: Partial<Order> = {
            displayName: `TODO`, // TODO
            exchangeId: exchange,
            baseSymbolId,
            quoteSymbolId,
            botRunId,
            extOrderId: "TEST",
            strike: price,
            quantity,
            stateId: OrderState.OPEN,
        };

        // ... place order goes here
        if (record.modeId === Mode.LIVE || record.modeId === Mode.LIVE_TEST) {

            //
            // TODO: Place actual order ... use delegate
            //
        }

        const savedOrder = await orders.addOrderToDatabase(order);
        log.debug(`Bot places SELL order`, savedOrder);

        debugger;
        return savedOrder;
    };

    return ctx as BotContext;
}