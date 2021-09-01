import { BotContext, botIdentifier } from "../../common-backend/bots/BotContext";
import { BotImplementationBase } from "../../common-backend/bots/BotImplementationBase";
import { IndicatorChromosome } from "../../common-backend/genetics/IndicatorChromosome";
import { Price } from "../../common/models/system/Price";
import { PriceUpdateMessage } from "../../common-backend/messages/trading";
import { isNullOrUndefined } from "../../common/utils";


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
        const fsmState = state.fsmState || GeneticBotFsmState.WAITING_FOR_BUY_OPP;

        //log.info(`GeneticBot with genome '${currentGenome}' ticks @ '${close}' with ${prices.length} prices`);

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
            for (const indicator of activeIndicators) {
                const signal = await indicator.computeBuySellSignal(ctx, price as Price, indicators.get(indicator.name));
                const [buyWeight, sellWeight] = indicator.getBuySellWeights(ctx);

                const weight = isBuying
                    ? buyWeight
                    : sellWeight
                    ;

                if (isBuying && signal < 0) {
                    continue;
                }
                else if (!isBuying && signal > 0) {
                    continue;
                }

                weightedAverage += signal * weight;
            }

            weightedAverage /= numIndicators;
            console.log(`[BOT] [${instance.name}] [${instance.symbols}] Buy/sell signal is ${weightedAverage}`);

            const thresholdGene = isBuying
                ? genome.getGene("BUY", "T")
                : genome.getGene("SELL", "T")
                ;

            const thresholdValue = isNullOrUndefined(thresholdGene.value)
                ? thresholdGene.defaultValue
                : thresholdGene.value
                ;

            if (weightedAverage >= thresholdValue) {
                const buyOrSell = isBuying ? "BUY" : "SELL";
                console.log(`[BOT] [${instance.name}] says TIME TO ${buyOrSell} ${buyOrSell} ${buyOrSell}`);
            }
        }

        const newState = Object.assign({}, state, <GeneticBotState>{
            fsmState,
        });
        return newState;
    }
}
