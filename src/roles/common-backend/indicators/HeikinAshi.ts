import { BotContext } from "../bots/BotContext";
import { GeneticBotState } from "../../common-backend/bots/GeneticBot";
import { IndicatorChromosome } from "../genetics/IndicatorChromosome";
import { Money } from "../../common/numbers";
import { Price } from "../../common/models/markets/Price";
import { PriceUpdateMessage } from "../messages/trading";
import { millisecondsPerResInterval, normalizePriceTime } from "../../common/utils/time";
import { names } from "../genetics/base-genetics";


/**
 * Heikin Ashi indicator
 */
export class HeikinAshiIndicator extends IndicatorChromosome {

    getBuySellWeights(ctx: BotContext<GeneticBotState>): [number, number] {
        const { genome } = ctx;
        const buyWeightGene = genome.getGene<number>("HA", "BW");
        const sellWeightGene = genome.getGene<number>("HA", "SW");

        const buyWeight = buyWeightGene.value || buyWeightGene.default;
        const sellWeight = sellWeightGene.value || sellWeightGene.default;

        return [buyWeight, sellWeight];
    }

    batchCompute(ctx: BotContext<GeneticBotState>, prices: Price[]) {
        const series: Partial<Price>[] = [];

        for (let i = 0; i < prices.length; ++i) {
            const tick = prices[i];
            const prev: Partial<Price> = i === 0 ? null : series[i - 1];
            let curr: Partial<Price> = null;
            if (!prev) {
                const { open, high, low } = tick;
                let { close } = tick;

                close = Money("0.25").mul(
                    (open.add(high).add(low).add(close)),
                );
                curr = Object.assign({}, tick, { open, high, low, close })
            }
            else {
                const close = Money("0.25").mul(
                    (tick.open.add(tick.high).add(tick.low).add(tick.close)),
                );

                const open = Money("0.5").mul(
                    (prev.open.add(prev.close)),
                );

                const high = Money(Math.max(tick.high.round(11).toNumber(), open.round(11).toNumber(), close.round(11).toNumber()).toString());
                const low = Money(Math.min(tick.low.round(11).toNumber(), open.round(11).toNumber(), close.round(11).toNumber()).toString());

                curr = Object.assign({}, tick, { open, high, low, close });
            }

            series.push(curr);

            this.computeSignalForCandle(ctx, curr, prev);
        }

        return series;
    }

    computeCandle(ctx, tick: Partial<Price>, prev: Partial<Price>) {
        if (!prev) {
            const { open, high, low } = tick;
            let { close } = tick;

            close = Money("0.25").mul(
                (open.add(high).add(low).add(close)),
            );
            return Object.assign({}, tick, { open, high, low, close })
        }
        else {
            const close = Money("0.25").mul(
                (tick.open.add(tick.high).add(tick.low).add(tick.close)),
            );

            const open = Money("0.5").mul(
                (prev.open.add(prev.close)),
            );

            const high = Money(Math.max(tick.high.round(11).toNumber(), open.round(11).toNumber(), close.round(11).toNumber()).toString());
            const low = Money(Math.min(tick.low.round(11).toNumber(), open.round(11).toNumber(), close.round(11).toNumber()).toString());

            return Object.assign({}, tick, { open, high, low, close });
        }
    }

    computeSignalForCandle(ctx: BotContext<GeneticBotState>, tick: Partial<Price>, prev: Partial<Price> = null) {
        const { open, high, low, close } = tick;
        const isGreen = close.gt(open);

        const { genome, instance } = ctx;
        const { resId } = instance;

        const intervalFloor = normalizePriceTime(resId, new Date(tick.ts.getTime() - 1)).getTime();
        const progress = Math.round(100 * (tick.ts.getTime() - intervalFloor) / millisecondsPerResInterval(resId));

        const progressGene = genome.getGene(names.GENETICS_C_HEIKIN_ASHI, names.GENETICS_C_HEIKIN_ASHI_G_INTERVAL_ELAPSED_PCT);
        if (progress < progressGene.value) {
            return 0;
        }

        // TODO: Proper noise filtering mechanism
        const wickHeight = high.minus(low).round(11).toNumber();
        const barHeight = Math.abs(close.minus(open).round(11).toNumber());

        const barWickRatio = barHeight / wickHeight;
        const thresh = 0.25;

        const filtered = barWickRatio < thresh;
        const result = isGreen;// && !filtered;
        return result ? 1 : -1;
    }

    // NOTE: These aren't copied by the genomics handling, so are undefined
    // to begin with during backtesting, and will be for each tick on forward testing.
    // A proper caching strategy for ticks still needs to be implemented.
    computedCandles: Partial<Price>[] = [];
    latestTs: string = null;
    latest: number;

    async computeBuySellSignal(ctx: BotContext<GeneticBotState>, tick: Price): Promise<number> {
        const signal = this.compute(ctx, tick);
        return signal;
    }

    async compute(ctx: BotContext<GeneticBotState>, tick: Price): Promise<number> {
        const { genome, log, prices } = ctx;

        if (tick.ts.toISOString() === this.latestTs) {
            return this.latest;
        }
        else {
            if (!this.computedCandles || this.computedCandles.length === 0) {
                this.computedCandles = this.batchCompute(ctx, ctx.prices);
            }

            const [last] = this.computedCandles.slice(-1);
            const candle = this.computeCandle(ctx, tick, last);
            this.computedCandles.push(candle);

            const signal = await this.computeSignalForCandle(ctx, candle);
            this.latest = signal;
            this.latestTs = tick.ts.toISOString();
            return signal;
        }
    }
}
