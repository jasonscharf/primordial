import { Knex } from "knex";
import env from "../env";
import { BotContext, botIdentifier } from "./BotContext";
import { BotImplementationBase } from "./BotImplementationBase";
import { GeneticBotFsmState } from "../../common/models/bots/BotState";
import { IndicatorChromosome } from "../genetics/IndicatorChromosome";
import { Mode } from "../../common/models/system/Strategy";
import { Order, OrderState } from "../../common/models/markets/Order";
import { OrderDelegateArgs } from "./BotOrderDelegate";
import { OrderStatusUpdateMessage, PriceUpdateMessage } from "../messages/trading";
import { Price } from "../../common/models/markets/Price";
import { capital, orders } from "../includes";
import { isNullOrUndefined, Money } from "../../common/utils";
import { shortDateAndTime } from "../../common/utils/time";
import { names } from "../genetics/base-genetics";



// Note: This type will load from DB JSON
export interface GeneticBotState {
    fsmState: GeneticBotFsmState;
    prevFsmState: GeneticBotFsmState;
    prevFsmStateChangeTs: Date;
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

        const fsmState = GeneticBotFsmState.WAITING_FOR_BUY_OPP;
        return <GeneticBotState>{
            fsmState,
            prevFsmState: fsmState,
            prevFsmStateChangeTs: new Date(), // TODO: Use ctx time
        };
    }

    async handleOrderStatusChange(ctx: BotContext<GeneticBotState>, msg: OrderStatusUpdateMessage, trx?: Knex.Transaction): Promise<GeneticBotState> {
        const { genome, instance, log, prices, state } = ctx;
        let { fsmState } = state;

        const { exchangeOrder, primoOrder } = msg;


        // If we're testing, there will be no actual exchange order
        let closedAt: Date = null;

        // Tiny leak of the fact we are testing or not here. We must update the order
        // TODO: Move this 
        if (instance.modeId === Mode.FORWARD_TEST || instance.modeId === Mode.LIVE_TEST || instance.modeId === Mode.LIVE) {
            primoOrder.stateId = OrderState.CLOSED;
            primoOrder.closed = new Date();
            await orders.updateOrder(primoOrder, trx);
        }
        else if (exchangeOrder) {
            // LIVE orders!!!
            switch (exchangeOrder.status) {
                case "open":
                    primoOrder.gross = Money((exchangeOrder.amount * exchangeOrder.cost).toString()); // TODO: VERIFY
                    primoOrder.stateId = OrderState.OPEN;
                    break;

                case "canceled":
                    primoOrder.closed = new Date();
                    primoOrder.stateId = OrderState.CANCELLED;
                    break;

                case "closed":
                    //debugger;
                    primoOrder.gross = Money((exchangeOrder.amount * exchangeOrder.cost).toString()); // TODO: VERIFY
                    primoOrder.closed = new Date();
                    primoOrder.stateId = OrderState.CLOSED;
                    break;

                default:
                    log.error(`Unknown order state '${exchangeOrder.status}'`);
            }
            primoOrder.stateId = OrderState.CLOSED;
            await orders.updateOrder(primoOrder, trx);
        }


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

        return this.changeFsmState(ctx, state, fsmState);
    }

    async computeIndicatorsForTick(ctx: BotContext<GeneticBotState>, tick: PriceUpdateMessage): Promise<Map<string, unknown>> {
        const { prices, state } = ctx;

        const activeIndicators = ctx.genome.chromosomesEnabled
            .filter(c => c.active)
            .filter(c => c instanceof IndicatorChromosome) as IndicatorChromosome[]
            ;

        // Run indicators in parallel
        const computations: Promise<unknown>[] = [];
        const indicators = new Map<string, unknown>();
        for (const indicator of activeIndicators) {
            computations.push(indicator.compute(ctx, tick as Price).then(output => indicators.set(indicator.name, output)));
        }

        await Promise.all(computations);

        return indicators;
    }

    async tick(ctx: BotContext<GeneticBotState>, tick: PriceUpdateMessage, signal: number, indicators: Map<string, unknown>) {
        const { genome, instance, log, prices, state } = ctx;
        const { close } = tick;
        const { currentGenome } = instance;


        let fsmState = state.fsmState;
        let newState = state;

        if (fsmState === GeneticBotFsmState.WAITING_FOR_BUY_OPP ||
            fsmState === GeneticBotFsmState.WAITING_FOR_SELL_OPP) {
            newState = await this.waitForTradeEntryOrExit(ctx, tick, signal, indicators);
        }

        // Note that we can immediately enter the surf logic here and thus place an order in the very same
        // tick that enter/exit conditions are met.
        if (newState.fsmState === GeneticBotFsmState.SURF_BUY ||
            newState.fsmState === GeneticBotFsmState.SURF_SELL) {
            newState = await this.handleSurfLogic(ctx, tick, indicators);
        }

        //log.debug(`Tick @ ${price.ts.toISOString()}. State: ${state.fsmState}`);
        return newState;
    }

    async computeSignal(ctx: BotContext<GeneticBotState>, tick: PriceUpdateMessage, indicators: Map<string, unknown>) {
        const { genome, instance, log, prices, state } = ctx;

        // Compute buy/sell signals
        const activeIndicators = ctx.genome.chromosomesEnabled
            .filter(c => c.active)
            .filter(c => c instanceof IndicatorChromosome) as IndicatorChromosome[]
            ;

        const computations: Promise<number>[] = [];
        const signals = new Map<string, unknown>();

        const { fsmState } = state;
        const isBuying = (fsmState === GeneticBotFsmState.SURF_BUY || fsmState === GeneticBotFsmState.WAITING_FOR_BUY_OPP);

        // TODO: Parallelize
        const numIndicators = activeIndicators.length;
        let weightedAverage = 0;
        for (const indicator of activeIndicators) {
            const indicatorValues = indicators.get(indicator.name);
            const signal = await indicator.computeBuySellSignal(ctx, tick as Price, indicatorValues);
            const [buyWeight, sellWeight] = indicator.getBuySellWeights(ctx);

            const weight = isBuying
                ? buyWeight
                : sellWeight
                ;

            weightedAverage += signal * weight;
        }

        weightedAverage /= numIndicators;
        return weightedAverage;
    }

    async placeOrder(ctx: BotContext<GeneticBotState>, tick: PriceUpdateMessage, indicators: Map<string, unknown>) {
        const { genome, instance, log, prices, trx, state } = ctx;
        const { close } = tick;
        const { currentGenome } = instance;

        let newState = state;
        let signals = state.signals || [];
        let fsmState = state.fsmState;

        const { alloc, items } = await capital.getAllocationLedger(instance.allocationId, trx);

        // Safety check. This should never, ever happen.
        if (alloc.live && instance.modeId !== Mode.LIVE && instance.modeId !== Mode.LIVE_TEST) {
            throw new Error(`FATAL: Bot was in test mode but requested a withdrawal from a LIVE allocation`);
        }

        const isBuying = fsmState === GeneticBotFsmState.SURF_BUY || fsmState === GeneticBotFsmState.WAITING_FOR_BUY_OPP;
        const isSelling = fsmState === GeneticBotFsmState.SURF_SELL || fsmState === GeneticBotFsmState.WAITING_FOR_SELL_OPP;

        const order: OrderDelegateArgs = {
            exchange: instance.exchangeId,
            market: instance.symbols,
            price: tick.close,
            limit: tick.close,
        };

        if (isBuying) {
            fsmState = GeneticBotFsmState.WAITING_FOR_BUY_ORDER_CONF;
            await ctx.placeLimitBuyOrder(ctx, order, tick, this);
        }
        else if (isSelling) {
            fsmState = GeneticBotFsmState.WAITING_FOR_SELL_ORDER_CONF;
            await ctx.placeLimitSellOrder(ctx, order, tick, this);
        }
        else {
            throw new Error(`Tried to place order in invalid state '${state.fsmState}'`);
        }

        return ctx.state;//this.changeFsmState(ctx, state, fsmState);
    }

    async handleSurfLogic(ctx: BotContext<GeneticBotState>, tick: PriceUpdateMessage, indicators: Map<string, unknown>) {
        const { genome, instance, log, prices, state } = ctx;
        const { close } = tick;
        const { currentGenome } = instance;
        let fsmState = state.fsmState;

        const profitTargetGene = genome.getGene<number>(names.GENETICS_C_PROFIT, names.GENETICS_C_PROFIT_G_TARGET);
        const profitTarget = state.targetPrice;
        const stopLossPrice = state.stopLossPrice;
        const stopLossEnabled = genome.getGene("SL", "ABS").active;

        let newState = state;
        if (fsmState === GeneticBotFsmState.SURF_BUY) {
            newState = await this.placeOrder(ctx, tick, indicators);
        }
        else if (fsmState === GeneticBotFsmState.SURF_SELL && !profitTargetGene.active) {
            newState = await this.placeOrder(ctx, tick, indicators);
        }
        else if (fsmState === GeneticBotFsmState.SURF_SELL && profitTargetGene.active && tick.close.gte(profitTarget)) {
            newState = await this.placeOrder(ctx, tick, indicators);
        }
        else if (fsmState === GeneticBotFsmState.SURF_SELL && stopLossEnabled && tick.close.lte(stopLossPrice)) {
            log.info(`Stoploss of ${stopLossPrice} hit. Selling...`);
            newState = await this.placeOrder(ctx, tick, indicators);
        }

        return newState;
    }

    async waitForTradeEntryOrExit(ctx: BotContext<GeneticBotState>, tick: PriceUpdateMessage, signal: number, indicators: Map<string, unknown>) {
        const { genome, instance, log, prices, state } = ctx;
        const { close } = tick;
        const { currentGenome } = instance;

        let fsmState = state.fsmState;
        let newState = state;

        const stopLossPrice = state.stopLossPrice;
        const stopLossEnabled = genome.getGene("SL", "ABS").active;

        if (fsmState == GeneticBotFsmState.WAITING_FOR_SELL_OPP && stopLossEnabled && tick.close.lte(stopLossPrice)) {
            log.info(`Stoploss of ${stopLossPrice} hit. Selling...`);
            newState = await this.placeOrder(ctx, tick, indicators);
            return newState;
        }

        // Look for BUY opportunities or SELL opportunities based on the current state
        if (fsmState === GeneticBotFsmState.WAITING_FOR_BUY_OPP ||
            fsmState === GeneticBotFsmState.WAITING_FOR_SELL_OPP) {
            const isBuying = fsmState === GeneticBotFsmState.WAITING_FOR_BUY_OPP;

            const thresholdValue = isBuying
                ? genome.getGene<number>("BUY", "T").value
                : genome.getGene<number>("SELL", "T").value
                ;

            if (state.verbose) {
                console.log(`[BOT] [${instance.name}] [${instance.symbols}] [${state.fsmState}] Buy/sell signal is ${signal} (T: ${thresholdValue}) @ ${shortDateAndTime(tick.ts)}`);
            }

            // Make trade!

            let forceTestPurchase = false;
            const hasSignal = (isBuying && signal >= thresholdValue) || (!isBuying && signal <= thresholdValue);

            if (hasSignal || (env.isDev() && forceTestPurchase)) {
                const buyOrSell = isBuying ? "BUY" : "SELL";

                // TODO: Surfing control genes
                fsmState = isBuying
                    ? GeneticBotFsmState.SURF_BUY
                    : GeneticBotFsmState.SURF_SELL
                    ;
            }
        }

        return this.changeFsmState(ctx, newState, fsmState);
    }
}
