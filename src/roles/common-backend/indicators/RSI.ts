const talib = require("talib");
import { BotContext } from "../bots/BotContext";
import { GeneticBotState } from "../../worker/bots/GeneticBot";
import { IndicatorChromosome } from "../genetics/IndicatorChromosome";
import { Price } from "../../common/models/markets/Price";
import { PriceUpdateMessage } from "../messages/trading";
import { isNullOrUndefined } from "../../common/utils";


/**
 * Relative Strength Index
 */
export class RsiIndicatorChromosome extends IndicatorChromosome {

    getBuySellWeights(ctx: BotContext<GeneticBotState>): [number, number] {
        const { genome } = ctx;
        const buyWeightGene = genome.getGene<number>("RSI", "BW");
        const sellWeightGene = genome.getGene<number>("RSI", "SW");

        const buyWeight = buyWeightGene.value || buyWeightGene.defaultValue;
        const sellWeight = sellWeightGene.value || sellWeightGene.defaultValue;

        return [buyWeight, sellWeight];
    }

    async computeBuySellSignal(ctx: BotContext<GeneticBotState>, price: PriceUpdateMessage, values: number[]): Promise<number> {
        const { genome } = ctx;
        const vals = values as number[];
        const thresholdLow = genome.getGene<number>("RSI", "L").value;
        const thresholdHigh = genome.getGene<number>("RSI", "H").value;

        let buy = 0;
        let sell = 0;
        const currentRsi = vals[vals.length - 1];

        const { close } = price;
        if (currentRsi < thresholdLow) {
            buy = 1;
        }

        if (currentRsi > thresholdHigh) {
            sell = 1;
        }

        const normalized = buy || (sell * - 1);
        return normalized;
    }

    async compute(ctx: BotContext<GeneticBotState>, tick: Price): Promise<number> {
        const { genome, log, prices } = ctx;

        const optInTimePeriod = genome.getGene<number>("RSI", "OITP").value;
        const windowLen = genome.getGene<number>("RSI", "WL").value;

        if (optInTimePeriod >= windowLen) {
            log.warn(`RSI opt-in period is greater than or equal to windowLen. RSI will be invlid.`);
        }

        // TODO: Move to base

        // Add the current tick to the price window
        const priceWindow = prices.slice(-(windowLen - 1)).concat(tick);
        const high = priceWindow.map(p => p.high.toNumber());
        const low = priceWindow.map(p => p.low.toNumber());
        const open = priceWindow.map(p => p.open.toNumber());
        const close = priceWindow.map(p => p.close.toNumber());

        return new Promise((res, rej) => {
            talib.execute({
                name: "RSI",
                startIdx: 0,
                endIdx: close.length - 1,
                high,
                low,
                close,
                inReal: close,
                optInTimePeriod,
            },
                (err, output) => {
                    if (err) {
                        return rej(err);
                    }
                    else {
                        return res(output.result.outReal);
                    }
                });
        });
    }
}
