import { BotContext } from "../bots/BotContext";
import { GeneticBotState } from "../../common-backend/bots/GeneticBot";
import { IndicatorChromosome } from "../genetics/IndicatorChromosome";
import { Money } from "../../common/numbers";
import { Price } from "../../common/models/markets/Price";
import { PriceUpdateMessage } from "../messages/trading";
import { shortDateAndTime } from "../../common/utils/time";


/**
 * Heikin Ashi indicator
 */
export class HeikinAshiIndicator extends IndicatorChromosome {

    getBuySellWeights(ctx: BotContext<GeneticBotState>): [number, number] {
        const { genome } = ctx;
        const buyWeightGene = genome.getGene<number>("HA", "BW");
        const sellWeightGene = genome.getGene<number>("HA", "SW");

        const buyWeight = buyWeightGene.value || buyWeightGene.defaultValue;
        const sellWeight = sellWeightGene.value || sellWeightGene.defaultValue;

        return [buyWeight, sellWeight];
    }

    computeSeries(prices: Price[]) {
        const series: Partial<Price>[] = [];

        for (let i = 0; i < prices.length; ++i) {
            const tick = prices[i];
            const prev: Partial<Price> = i === 0 ? null : series[i - 1];
            if (!prev) {
                let { open, high, low, close } = tick;
                close = Money("0.25").mul(
                    (open.add(high).add(low).add(close)),
                );
                series.push(Object.assign({}, tick, { open, high, low, close }));
            }
            else {

                const close = Money("0.25").mul(
                    (tick.open.add(tick.high).add(tick.low).add(tick.close)),
                );

                const open = Money("0.5").mul(
                    (prev.open.add(prev.close)),
                );

                const high = Money(Math.max(tick.high.round(12).toNumber(), open.round(12).toNumber(), close.round(12).toNumber()).toString());
                const low = Money(Math.min(tick.low.round(12).toNumber(), open.round(12).toNumber(), close.round(12).toNumber()).toString());

                series.push(Object.assign({}, tick, { open, high, low, close }));
            }
        }

        return series;
    }

    isGreen(ctx: BotContext<GeneticBotState>, tick: Price, values) {
        const { genome, prices } = ctx;
        const series = this.computeSeries(prices);
        const prev = series[series.length - 2];

        let buy = 0;
        let sell = 0;

        const close = Money("0.25").mul(
            (tick.open.add(tick.high).add(tick.low).add(tick.close)),
        );

        const open = Money("0.5").mul(
            (prev.open.add(prev.close)),
        );

        const high = Math.max(tick.high.round(12).toNumber(), open.round(12).toNumber(), close.round(12).toNumber());
        const low = Math.min(tick.low.round(12).toNumber(), open.round(12).toNumber(), close.round(12).toNumber());

        const isGreen = close.gt(open);

        //console.log(`Heikin-Ashi is ${isGreen ? "GREEN" : "RED"} on ${shortDateAndTime(tick.ts)}`);

        return isGreen;
    }

    async computeBuySellSignal(ctx: BotContext<GeneticBotState>, price: PriceUpdateMessage, values: number[]): Promise<number> {
        const isGreen = this.isGreen(ctx, price, values);
        return isGreen ? 1 : -1;;
    }

    async compute(ctx: BotContext<GeneticBotState>, tick: Price): Promise<number> {
        const { genome, log, prices } = ctx;

        const isGreen = this.isGreen(ctx, tick, []);
        return isGreen ? 1 : -1;;
    }
}
