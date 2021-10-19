import { Knex } from "knex";
import env from "../env";
import { AllocationItem } from "../../common/models/capital/AllocationItem";
import { AllocationTransaction } from "../../common/models/capital/AllocationTransaction";
import { AllocationTransactionType } from "../../common/models/capital/AllocationTransactionType";
import { BacktestRequest } from "../messages/testing";
import { BotDefinition } from "../../common/models/bots/BotDefinition";
import { BotImplementation } from "./BotImplementation";
import { BotInstance, BotInstanceStateInternal } from "../../common/models/bots/BotInstance";
import { BotRun } from "../../common/models/bots/BotRun";
import { Genome } from "../../common/models/genetics/Genome";
import { GeneticBotFsmState } from "../../common/models/bots/BotState";
import { GeneticBot, GeneticBotState } from "./GeneticBot";
import { GenomeParser } from "../genetics/GenomeParser";
import { Logger } from "../../common/utils/Logger";
import { Mode } from "../../common/models/system/Strategy";
import { Money } from "../../common/numbers";
import { NullLogger } from "../../common/utils/NullLogger";
import { OrderStatusUpdateMessage } from "../messages/trading";
import { Order, OrderState, OrderType } from "../../common/models/markets/Order";
import { OrderDelegateArgs } from "./BotOrderDelegate";
import { Price } from "../../common/models/markets/Price";
import { capital, constants, log, mq, orders, strats } from "../includes";
import { moneytize } from "../database/utils";
import { randomString } from "../utils";
import { DEFAULT_BACKTEST_BUDGET_AMOUNT } from "../commands/bots/test";
import { events, queue } from "../constants";



/**
 * Runtime context for a bot implementation.
 */
export interface BotContext<TState = GeneticBotState> {
    def: BotDefinition;
    instance: BotInstance;
    genome: Genome;
    runId: string;
    state: TState;
    stateInternal: BotInstanceStateInternal;
    log: Logger;
    prices: Price[];
    indicators: Map<string, unknown>;
    trx?: Knex.Transaction;
    backtestingOrders?: Partial<Order>[];

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
 * Builds a no-op context for running signal and indicator generation after the fact.
 * @param args 
 * @returns 
 */
export async function buildBotContextForSignalsComputation(args: BacktestRequest): Promise<BotContext> {
    const { genome, from, res, to } = args;
    const { genome: parsedGenome } = new GenomeParser().parse(genome);
    const def: Partial<BotDefinition> = {
        id: randomString(),
    };
    const record: Partial<BotInstance> = {
        id: randomString(),
        allocationId: null,
        build: "",
        currentGenome: genome,
        exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
        definitionId: def.id,
        modeId: Mode.BACK_TEST,
        normalizedGenome: genome,
        prevTick: new Date(from.getTime() - 1),
        resId: res,
    };

    const prices = [];
    const indicators = new Map<string, number[]>();
    const ctx: BotContext = {
        def: def as BotDefinition,
        instance: record as BotInstance,
        genome: parsedGenome,
        state: record.stateJson as GeneticBotState,
        stateInternal: record.stateInternal,
        log: new NullLogger(),
        runId: null,
        cancelAllOrders: () => void 0,
        placeLimitBuyOrder: () => void 0,
        placeLimitSellOrder: () => void 0,
        placeStopLoss: () => void 0,
        prices,
        indicators,
    };

    return ctx;
}

export function buildContextBase(def: BotDefinition, record: BotInstance, run: BotRun): Partial<BotContext> {
    const { genome } = new GenomeParser().parse(record.currentGenome);
    const ctx: Partial<BotContext> = {
        def,
        instance: record,
        genome,
        state: record.stateJson as GeneticBotState,
        stateInternal: record.stateInternal,
        log,
        runId: run ? run.id : null,
    };

    return ctx;
}

export async function buildBacktestingContext(def: BotDefinition, record: BotInstance, run: BotRun): Promise<BotContext> {
    const { genome } = new GenomeParser().parse(record.currentGenome);
    const ctx = buildContextBase(def, record, run);
    ctx.backtestingOrders = [];

    async function placeBacktestOrder(ctx: BotContext<GeneticBotState>, args: OrderDelegateArgs, tick: Price, liveInstance: BotImplementation, buy = true, backtestArgs: BacktestRequest = null) {
        const { instance, state } = ctx;
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
            stateId: OrderState.OPEN,
            opened: tick.ts,
        };

        // Dummy, not-in-the-DB item shunt for BT
        const item: Partial<AllocationItem> = {
            amount: Money(DEFAULT_BACKTEST_BUDGET_AMOUNT + ""),
            maxWagerPct: 0.1,
            symbolId: quoteSymbolId,
        };

        const { amount, quantity, stopLossPct, targetPrice } = computeOrderProps(ctx as BotContext<GeneticBotState>, genome, tick, order, item as AllocationItem, buy);

        order.id = `FAKE.${randomString(16)}`;

        const newFsmState = buy
            ? GeneticBotFsmState.WAITING_FOR_BUY_ORDER_CONF
            : GeneticBotFsmState.WAITING_FOR_SELL_ORDER_CONF
            ;

        liveInstance.changeFsmState(ctx, state, newFsmState);

        if (buy) {
            state.prevQuantity = quantity;
            state.prevPrice = purchasePrice;
            state.prevOrderId = order.id;
            state.stopLossPrice = tick.close.add(tick.close.mul(stopLossPct.toString()));
            state.targetPrice = targetPrice;
        }
        else {

            // Link the sell back to the previous buy
            order.relatedOrderId = state.prevOrderId;

            state.prevQuantity = null;
            state.prevPrice = null;
            state.prevOrderId = null;
            state.stopLossPrice = null;
            state.targetPrice = null;
        }

        const msg: OrderStatusUpdateMessage = {
            instanceId: instance.id,
            exchangeOrder: null,
            primoOrder: order as Order,
        };

        // Let the bot handle open and close separately, simulating real-world conditions
        order.stateId = OrderState.OPEN;

        ctx.state = await liveInstance.handleOrderStatusChange(ctx, msg, null);

        order.stateId = OrderState.CLOSED;

        ctx.state = await liveInstance.handleOrderStatusChange(ctx, msg, null);
        ctx.backtestingOrders.push(order);

        order.closed = tick.ts;
        return order as Order;
    }

    ctx.placeLimitBuyOrder = async (ctx: BotContext<GeneticBotState>, args: OrderDelegateArgs, tick: Price, liveInstance: BotImplementation) => {
        return placeBacktestOrder(ctx, args, tick, liveInstance, true);
    }

    ctx.placeLimitSellOrder = async (ctx: BotContext<GeneticBotState>, args, tick: Price, liveInstance: BotImplementation) => {
        return placeBacktestOrder(ctx, args, tick, liveInstance, false);
    };

    return ctx as BotContext;
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
    const ctx = buildContextBase(def, record, run);

    async function placeOrder(ctx: BotContext, args, tick: Price, liveInstance: BotImplementation, buy = true, backtestArgs: BacktestRequest = null) {

        const { instance, state, trx } = ctx as BotContext<GeneticBotState>;
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
            stateId: OrderState.OPEN,
        };

        const isLive = record.modeId === Mode.LIVE || record.modeId === Mode.LIVE_TEST;
        const modeStr = isLive
            ? "LIVE"
            : "paper"
            ;

        let savedOrder: Order;

        const t = await capital.transact(instance.id, order.quoteSymbolId, order, trx, async (item, trx) => {

            const { amount, quantity, stopLossPct, targetPrice } = computeOrderProps(ctx as BotContext<GeneticBotState>, genome, tick, order, item, buy);

            order.opened = new Date();
            if (!buy) {
                // Link the sell back to previous buy
                order.relatedOrderId = state.prevOrderId;
            }

            if (!backtestArgs) {
                savedOrder = await orders.addOrderToDatabase(order, trx);
            }

            //log.info(`Placing ${modeStr} order for ${order.baseSymbolId} @ ${order.price} ${order.quoteSymbolId}`);

            const transaction: Partial<AllocationTransaction> = {
                allocationItemId: item.id,
                orderId: savedOrder.id,
                displayName: savedOrder.displayName,
                typeId: AllocationTransactionType.DEBIT,
                amount,
            };

            // HACK: Assumes GeneticBot. Perhaps FSM state should be generic
            let fsmState = state.fsmState;
            let newFsmState = buy
                ? GeneticBotFsmState.WAITING_FOR_BUY_ORDER_CONF
                : GeneticBotFsmState.WAITING_FOR_SELL_ORDER_CONF
                ;

            liveInstance.changeFsmState(ctx, state, newFsmState);

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

            // For forward tests, we put two synthetic order updates on the queue to simulate open and close
            if (instance.modeId === Mode.FORWARD_TEST) {

                // Note: Even though bot tick logic - which ultimately calls this handler - saves the bot
                // after each tick, it's important than we save the bot _in this transaction_.
                // Specifically, it allows us to safely schedule synthetic order updates below, knowing that
                // the bot is in the correct state.
                instance.stateJson = ctx.state;

                await strats.updateBotInstance(instance, trx);
            }
            else if (!isLive) {

                // If this bot isn't live , we call its order status change handler directly instead of using the MQ.
                const msg: OrderStatusUpdateMessage = {
                    instanceId: instance.id,
                    exchangeOrder: null,
                    primoOrder: savedOrder,
                };

                // Let the bot handle open and close separately
                savedOrder.stateId = OrderState.OPEN;

                ctx.state = await liveInstance.handleOrderStatusChange(ctx, msg, trx);

                savedOrder.stateId = OrderState.CLOSED;
                savedOrder.closed = new Date();

                if (!backtestArgs) {
                    savedOrder = await orders.updateOrder(savedOrder, trx);
                }

                msg.primoOrder = savedOrder;

                ctx.state = await liveInstance.handleOrderStatusChange(ctx, msg, trx);
                instance.stateJson = ctx.state;
                await strats.updateBotInstance(instance, trx);
            }
            else {
                // LIVE ORDER! Nothing to actually do here.
                // At this point, the system will wait for order update messages from the exchange.
                debugger;
            }

            //log.debug(`Bot places ${buyOrSell} order`, moneytize(savedOrder));
            return transaction;
        });

        if (instance.modeId === Mode.FORWARD_TEST) {
            const openMsg: OrderStatusUpdateMessage = {
                instanceId: instance.id,
                exchangeOrder: null,
                primoOrder: savedOrder,
            };

            mq.addWorkerMessageHi(events.EVENT_ORDER_STATUS_UPDATE, openMsg);
        }

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

export function computeOrderProps(ctx: BotContext<GeneticBotState>, genome: Genome, tick: Price, order: Partial<Order>, item: AllocationItem, buy: boolean) {
    const { state } = ctx;
    const maxBuyingPower = item.amount.mul(Money(item.maxWagerPct.toString()));
    const profitTargetGene = genome.getGene<number>("PRF", "TGT");
    const stopLossPct = genome.getGene<number>("SL", "ABS").value;

    // TODO: Double-check PoC bot
    // TODO: Exchange-based fee structure
    // TODO: Fees tracking

    const purchasePrice = tick.close;

    let amount: Money = null;

    // Binance
    //const fees = purchasePrice.mul(constants.DEFAULT_EXCHANGE_FEE + "");
    const fees = purchasePrice.mul("0.001");

    let quantity: Money = null;
    if (buy) {
        quantity = maxBuyingPower.div(purchasePrice);
        amount = purchasePrice.mul(quantity).mul("-1");
    }
    else {
        quantity = Money(state.prevQuantity);
        amount = purchasePrice.mul(quantity);
    }

    const buyOrSell = buy
        ? "BUY"
        : "SELL"
        ;

    // TODO: Infer a better profit target when none specified. Account for fees.
    const profitTargetPct = profitTargetGene.active
        ? profitTargetGene.value
        : 0.002 // FIX/COMMENT
        ;
    const targetPrice = tick.close.add(tick.close.mul(profitTargetPct.toString()));


    // IMPORTANT: NOTE: We are specifying fees here without knowing the actual cost (fills),
    //  OR about any discounts, e.g. Binance's discount for holding BNB.
    //  For sell orders, "fees" is initially AN APPROXIMATION until the order closes and we know
    //  the fills and/or average price (or however fills are calculated per exchange).
    // This works for backtesting, but properly handling fees in live trading is another (scheduled) topic.
    order.fees = fees;
    order.botRunId = ctx.runId;
    order.quantity = quantity;
    order.price = purchasePrice;
    order.limit = purchasePrice;
    order.gross = amount;

    order.strike = targetPrice;
    order.displayName = `${buyOrSell} ${quantity.round(8)} X ${order.baseSymbolId} @ ${order.price} ${order.quoteSymbolId} = ${amount.round(8).toString()} ${order.quoteSymbolId}`;
    order.extOrderId = "FAKE";
    order.typeId = buy ? OrderType.LIMIT_BUY : OrderType.LIMIT_SELL;

    return {
        amount,
        quantity,
        stopLossPct,
        targetPrice,
    };
}
