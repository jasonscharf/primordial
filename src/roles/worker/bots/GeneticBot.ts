import { Knex } from "knex";
import { BotContext, botIdentifier } from "../../common-backend/bots/BotContext";
import { BotImplementationBase } from "../../common-backend/bots/BotImplementationBase";
import { IndicatorChromosome } from "../../common-backend/genetics/IndicatorChromosome";
import { Mode } from "../../common/models/system/Strategy";
import { Order, OrderState } from "../../common/models/markets/Order";
import { OrderDelegateArgs } from "../../common-backend/bots/BotOrderDelegate";
import { OrderStatusUpdateMessage, PriceUpdateMessage } from "../../common-backend/messages/trading";
import { Price } from "../../common/models/markets/Price";
import { capital, orders } from "../../common-backend/includes";
import { isNullOrUndefined, Money } from "../../common/utils";
import { shortDateAndTime } from "../../common/utils/time";



export enum GeneticBotFsmState {
    WAITING_FOR_BUY_OPP = "wait-for-buy-opp",
    WAITING_FOR_SELL_OPP = "wait-for-sell-opp",
    WAITING_FOR_BUY_ORDER_CONF = "wait-for-buy-order-conf",
    WAITING_FOR_SELL_ORDER_CONF = "wait-for-sell-order-conf",
    SURF_SELL = "sell-surf",
    SURF_BUY = "buy-surf",
}

export interface GeneticBotState {
    fsmState: GeneticBotFsmState;
    signals: number[];
    prevQuantity: Money;
    prevPrice: Money;
    prevOrderId: string;
    stopLossPrice: Money;
    targetPrice: Money;
    verbose?: boolean;
}

/**
 * Basic genetic bot, configured entirely via genome.
 */
export class GeneticBot extends BotImplementationBase<GeneticBotState> {

    /**
     * Initializes a newly running bot.
     * @param ctx 
     */
    async initialize(ctx: BotContext<GeneticBotState>): Promise<GeneticBotState> {
        const { instance } = ctx;
        ctx.log.info(`[BOT] ${botIdentifier(instance)} initializes'`);

        return <GeneticBotState>{
            fsmState: GeneticBotFsmState.WAITING_FOR_BUY_OPP,
        };
    }

    async handleOrderStatusChange(ctx: BotContext<GeneticBotState>, msg: OrderStatusUpdateMessage, trx?: Knex.Transaction): Promise<GeneticBotState> {
        const { genome, instance, log, prices, state } = ctx;
        let { fsmState } = state;

        const { exchangeOrder, primoOrder } = msg;
        //log.info(`Order status change to ${msg.primoOrder.stateId.toUpperCase()}`);


        // First, update the Primo order accordingly
        const order = msg.primoOrder;
        const exo = msg.exchangeOrder;

        // If we're testing, there will be no actual exchange order

        if (!msg.exchangeOrder) {
            // Testing
            //order.gross = order.quantity.mul(order.price);
        }
        else {
            // LIVE orders!!!
            switch (exo.status) {
                case "open":
                    order.gross = Money((exo.amount * exo.cost).toString()); // TODO: VERIFY
                    order.stateId = OrderState.OPEN;
                    break;

                case "canceled":
                    order.closed = new Date();
                    order.stateId = OrderState.CANCELLED;
                    break;

                case "closed":
                    debugger;
                    order.gross = Money((exo.amount * exo.cost).toString()); // TODO: VERIFY
                    order.closed = new Date();
                    order.stateId = OrderState.CLOSED;
                    break;

                default:
                    log.error(`Unknown order state '${exo.status}'`);
            }
        }

        //await orders.updateOrder(order, trx);


        if (primoOrder.stateId === OrderState.CLOSED) {
            //log.info(`ORDER COMPLETE! State is now ${fsmState}`);
            switch (fsmState) {
                case GeneticBotFsmState.WAITING_FOR_BUY_ORDER_CONF:
                    fsmState = GeneticBotFsmState.WAITING_FOR_SELL_OPP;
                    break;

                case GeneticBotFsmState.WAITING_FOR_SELL_ORDER_CONF:
                    fsmState = GeneticBotFsmState.WAITING_FOR_BUY_OPP;
                    break;

                default:
                    throw new Error(`Received order status change in invalid bot state ${fsmState}`);
            }
        }

        state.fsmState = fsmState;
        return state;
    }

    async computeIndicatorsForTick(ctx: BotContext<GeneticBotState>, price: PriceUpdateMessage): Promise<Map<string, unknown>> {
        const { prices, state } = ctx;

        const activeIndicators = ctx.genome.chromosomesEnabled
            .filter(c => c.active)
            .filter(c => c instanceof IndicatorChromosome) as IndicatorChromosome[]
            ;

        // Run indicators in parallel
        const computations: Promise<unknown>[] = [];
        const indicators = new Map<string, unknown>();
        for (const indicator of activeIndicators) {
            computations.push(indicator.compute(ctx, price as Price).then(output => indicators.set(indicator.name, output)));
        }

        await Promise.all(computations);

        return indicators;
    }

    async tick(ctx: BotContext<GeneticBotState>, price: PriceUpdateMessage, indicators: Map<string, unknown>) {
        const { genome, instance, log, prices, state } = ctx;
        const { close } = price;
        const { currentGenome } = instance;

        // Set the FSM state if not already set
        if (!state.fsmState) {
            state.fsmState = GeneticBotFsmState.WAITING_FOR_BUY_OPP;
        }
        const fsmState = state.fsmState;
        let newState = state;

        if (fsmState === GeneticBotFsmState.WAITING_FOR_BUY_OPP ||
            fsmState === GeneticBotFsmState.WAITING_FOR_SELL_OPP) {
            newState = await this.waitForTradeEntryOrExit(ctx, price, indicators);
        }
        else if (fsmState === GeneticBotFsmState.SURF_BUY ||
            fsmState === GeneticBotFsmState.SURF_SELL) {
            newState = await this.handleSurfLogic(ctx, price, indicators);
        }

        //log.debug(`Tick @ ${price.ts.toISOString()}. State: ${state.fsmState}`);
        return newState;
    }

    async computeCurrentSignal(ctx: BotContext<GeneticBotState>, price: PriceUpdateMessage, indicators: Map<string, unknown>) {

    }

    async placeOrder(ctx: BotContext<GeneticBotState>, tick: PriceUpdateMessage, indicators: Map<string, unknown>) {
        const { genome, instance, log, prices, state } = ctx;
        const { close } = tick;
        const { currentGenome } = instance;

        let newState = state;
        let signals = state.signals || [];
        let fsmState = state.fsmState;

        const { alloc, items } = await capital.getAllocationLedger(instance.allocationId);

        // Safety check. This should never, ever happen.
        if (alloc.live && instance.modeId !== Mode.LIVE && instance.modeId !== Mode.LIVE_TEST) {
            throw new Error(`FATAL: Bot was in test mode but requested a withdrawal from a LIVE allocation`);
        }

        const isBuying = fsmState === GeneticBotFsmState.SURF_BUY;
        const isSelling = fsmState === GeneticBotFsmState.SURF_SELL;

        const order: OrderDelegateArgs = {
            exchange: instance.exchangeId,
            market: instance.symbols,
            price: tick.close,
            limit: tick.close,
        };

        if (isBuying) {
            state.fsmState = GeneticBotFsmState.WAITING_FOR_BUY_ORDER_CONF;
            await ctx.placeLimitBuyOrder(ctx, order, tick, this);
        }
        else if (isSelling) {
            state.fsmState = GeneticBotFsmState.WAITING_FOR_SELL_ORDER_CONF;
            await ctx.placeLimitSellOrder(ctx, order, tick, this);
        }
        else {
            throw new Error(`Tried to place order in invalid state`);
        }

        return state;
    }

    async handleSurfLogic(ctx: BotContext<GeneticBotState>, tick: PriceUpdateMessage, indicators: Map<string, unknown>) {
        const { genome, instance, log, prices, state } = ctx;
        const { close } = tick;
        const { currentGenome } = instance;
        let fsmState = state.fsmState;

        const profitTarget = state.targetPrice;
        const stopLossPrice = state.stopLossPrice;
        const stopLossEnabled = genome.getGene("SL", "ABS").active;

        let result = state;
        if (!profitTarget) {
            result = await this.placeOrder(ctx, tick, indicators);
        }
        else if (fsmState === GeneticBotFsmState.SURF_BUY) {
            result = await this.placeOrder(ctx, tick, indicators);
        }
        else if (fsmState === GeneticBotFsmState.SURF_SELL && tick.close.gte(profitTarget)) {
            result = await this.placeOrder(ctx, tick, indicators);
        }
        else if (fsmState === GeneticBotFsmState.SURF_SELL && stopLossEnabled && tick.close.lte(stopLossPrice)) {
            log.info(`Stoploss of ${stopLossPrice} hit. Selling...`);
            result = await this.placeOrder(ctx, tick, indicators);
        }

        return result;
    }

    async waitForTradeEntryOrExit(ctx: BotContext<GeneticBotState>, tick: PriceUpdateMessage, indicators: Map<string, unknown>) {
        const { genome, instance, log, prices, state } = ctx;
        const { close } = tick;
        const { currentGenome } = instance;

        let fsmState = state.fsmState;

        // Compute buy/sell signals
        const activeIndicators = ctx.genome.chromosomesEnabled
            .filter(c => c.active)
            .filter(c => c instanceof IndicatorChromosome) as IndicatorChromosome[]
            ;

        // Look for BUY opportunities or SELL opportunities based on the current state
        if (fsmState === GeneticBotFsmState.WAITING_FOR_BUY_OPP ||
            fsmState === GeneticBotFsmState.WAITING_FOR_SELL_OPP) {
            const isBuying = fsmState === GeneticBotFsmState.WAITING_FOR_BUY_OPP;

            // Run indicators in parallel
            const computations: Promise<number>[] = [];
            const signals = new Map<string, unknown>();

            // TODO: Parallel
            const numIndicators = activeIndicators.length;
            let weightedAverage = 0;
            let indicatorSummary = "";
            for (const indicator of activeIndicators) {
                const indicatorValues = indicators.get(indicator.name);
                const signal = await indicator.computeBuySellSignal(ctx, tick as Price, indicatorValues);
                const [buyWeight, sellWeight] = indicator.getBuySellWeights(ctx);

                const weight = isBuying
                    ? buyWeight
                    : sellWeight
                    ;

                /*
                if (isBuying && signal < 0) {
                    continue;
                }
                else if (!isBuying && signal > 0) {
                    continue;
                }*/

                weightedAverage += signal * weight;

                let valStr = "(?)";
                if (Array.isArray(indicatorValues) && indicatorValues.length > 0) {
                    valStr = Math.round(indicatorValues[indicatorValues.length - 1]).toString();
                }
                indicatorSummary += `${indicator.name}: ${signal} @ ${valStr}`;
            }

            weightedAverage /= numIndicators;


            const thresholdValue = isBuying
                ? genome.getGene<number>("BUY", "T").value
                : genome.getGene<number>("SELL", "T").value
                ;

            if (state.verbose) {
                console.log(`[BOT] [${instance.name}] [${instance.symbols}] [${state.fsmState}] Buy/sell signal is ${weightedAverage} (T: ${thresholdValue}). ${indicatorSummary} @ ${shortDateAndTime(tick.ts)}`);
            }

            // Make trade!
            if ((isBuying && weightedAverage >= thresholdValue) ||
                (!isBuying && weightedAverage <= thresholdValue)) {
                const buyOrSell = isBuying ? "BUY" : "SELL";

                // TODO: Surfing control genes
                fsmState = isBuying
                    ? GeneticBotFsmState.SURF_BUY
                    : GeneticBotFsmState.SURF_SELL
                    ;
            }
        }

        return Object.assign({}, state, { fsmState });
    }
}
