import env from "../env";
import { AllocationTransaction } from "../../common/models/capital/AllocationTransaction";
import { AllocationTransactionType } from "../../common/models/capital/AllocationTransactionType";
import { BacktestRequest } from "../messages/testing";
import { BotDefinition } from "../../common/models/bots/BotDefinition";
import { BotImplementation } from "./BotImplementation";
import { BotInstance, BotInstanceStateInternal } from "../../common/models/bots/BotInstance";
import { BotRun } from "../../common/models/bots/BotRun";
import { Genome } from "../../common/models/genetics/Genome";
import { GeneticBotFsmState, GeneticBotState } from "../../worker/bots/GeneticBot";
import { GenomeParser } from "../genetics/GenomeParser";
import { Logger } from "../../common/utils/Logger";
import { Mode } from "../../common/models/system/Strategy";
import { Money } from "../../common/numbers";
import { OrderStatusUpdateMessage } from "../messages/trading";
import { Order, OrderState, OrderType } from "../../common/models/markets/Order";
import { OrderDelegateArgs } from "./BotOrderDelegate";
import { Price } from "../../common/models/markets/Price";
import { capital, constants, log, mq, orders, strats } from "../includes";
import { moneytize } from "../database/utils";



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
    prices: Price[];
    indicators: Map<string, unknown>;

    placeLimitBuyOrder(ctx: BotContext, args: OrderDelegateArgs, tick: Price, instance: BotImplementation): Promise<Order>;
    placeLimitSellOrder(ctx: BotContext, args: OrderDelegateArgs, tick: Price, instance: BotImplementation): Promise<Order>;
    placeStopLoss(ctx: BotContext, args: OrderDelegateArgs, instance: BotImplementation): Promise<Order>;
    cancelAllOrders(ctx: BotContext, args: OrderDelegateArgs, instance: BotImplementation): Promise<Order[]>;
}

/**
 * Displays a bot's name and ID. Useful for logging purposes.
 * @param bot 
 * @returns 
 */
export function botIdentifier(bot: BotInstance) {
    if (!bot) {
        return `(null bot)`;
    }
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

    async function placeOrder(ctx: BotContext, args, tick: Price, liveInstance, buy = true, backtestArgs: BacktestRequest = null) {

        const { instance, state } = ctx as BotContext<GeneticBotState>;
        const { exchange, market } = args;
        const { id: botRunId } = run;
        const { baseSymbolId, quoteSymbolId } = ctx.stateInternal;

        const purchasePrice = tick.close;

        const order: Partial<Order> = {
            displayName: `TODO`, // TODO
            exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
            baseSymbolId,
            quoteSymbolId,
            botRunId,
            strike: purchasePrice,
            stateId: OrderState.OPEN,
        };

        const isLive = record.modeId === Mode.LIVE || record.modeId === Mode.LIVE_TEST;
        const modeStr = isLive
            ? "LIVE"
            : "paper"
            ;

        const buyOrSell = buy
            ? "BUY"
            : "SELL"
            ;

        let savedOrder: Order;
        const t = await capital.transact(instance.id, order.quoteSymbolId, order, async (item, trx) => {

            const maxBuyingPower = item.amount.mul(Money(item.maxWagerPct.toString()));
            const profitTargetGene = genome.getGene<number>("PROFIT", "TGTPCT");
            const stopLossPct = genome.getGene<number>("SL", "ABS").value;

            // TODO: Double-check PoC bot
            // TODO: Exchange-based fee structure
            // TODO: Fees tracking

            let amount: Money = null;
            const fees = purchasePrice.mul("0.001");

            let quantity: Money = null;
            if (buy) {
                quantity = maxBuyingPower.div(purchasePrice);
                amount = purchasePrice.mul(quantity).mul("-1");
            }
            else {
                quantity = state.prevQuantity;
                amount = purchasePrice.mul(quantity);
            }

            // TODO: Infer a better profit target when none specified. Account for fees.
            const profitTargetPct = profitTargetGene.active
                ? profitTargetGene.value
                : 0.002
                ;
            const targetPrice = tick.close.add(tick.close.mul(profitTargetPct.toString()));


            order.botRunId = botRunId;
            order.quantity = quantity;
            order.price = purchasePrice;
            order.limit = purchasePrice;
            order.gross = amount;

            order.strike = targetPrice;
            order.displayName = `${buyOrSell} ${quantity} X ${order.baseSymbolId} @ ${order.price} ${order.quoteSymbolId} = ${amount.round(8).toString()} ${order.quoteSymbolId}`;
            order.extOrderId = "FAKE";
            order.typeId = buy ? OrderType.LIMIT_BUY : OrderType.LIMIT_SELL;

            if (isLive) {
                order.opened = new Date();
            }
            else {
                order.opened = tick.ts;

                // Note: It's up to downstream componends 
            }

            if (!backtestArgs) {
                savedOrder = await orders.addOrderToDatabase(order, trx);
            }

            log.info(`Placing ${modeStr} order for ${order.baseSymbolId} @ ${order.price} ${order.quoteSymbolId}`);

            const transaction: Partial<AllocationTransaction> = {
                allocationItemId: item.id,
                orderId: savedOrder.id,
                displayName: savedOrder.displayName,
                typeId: AllocationTransactionType.DEBIT,
                amount,
            };

            // HACK: Assumes GeneticBot. Perhaps FSM state should be generic
            let fsmState = state.fsmState;
            state.fsmState = buy
                ? GeneticBotFsmState.WAITING_FOR_BUY_ORDER_CONF
                : GeneticBotFsmState.WAITING_FOR_SELL_ORDER_CONF
                ;

            if (buy) {
                state.prevQuantity = quantity;
                state.prevPrice = purchasePrice;
                state.prevOrderId = savedOrder.id;
                state.stopLossPrice = tick.close.add(tick.close.mul(stopLossPct.toString()));
                state.targetPrice = targetPrice;
            }
            else {
                state.prevQuantity = null;
                state.prevPrice = null;
                state.prevOrderId = null;
                state.stopLossPrice = null;
                state.targetPrice = null;
            }


            if (!isLive) {
                const msg: OrderStatusUpdateMessage = {
                    exchangeOrder: null,
                    primoOrder: savedOrder,
                };

                // Let the bot handle open and close separately
                savedOrder.stateId = OrderState.OPEN;

                ctx.state = await liveInstance.handleOrderStatusChange(ctx, msg, trx);

                savedOrder.stateId = OrderState.CLOSED;

                if (!backtestArgs) {
                    savedOrder = await orders.updateOrder(savedOrder, trx);
                }

                ctx.state = await liveInstance.handleOrderStatusChange(ctx, msg, trx);
            }

            //log.debug(`Bot places ${buyOrSell} order`, moneytize(savedOrder));
            return transaction;
        });

        return savedOrder;
    };



    ctx.placeLimitBuyOrder = async (ctx, args, tick: Price, liveInstance: BotImplementation) => {
        return placeOrder(ctx, args, tick, liveInstance, true);
    }
    //
    ctx.placeLimitSellOrder = async (ctx, args, tick: Price, liveInstance: BotImplementation) => {
        return placeOrder(ctx, args, tick, liveInstance, false);
    };

    return ctx as BotContext;
}