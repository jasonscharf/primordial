import { Chromosome } from "../../common/models/genetics/Chromosome";
import { Gene } from "../../common/models/genetics/Gene";
import { GeneticValueType } from "../../common/models/genetics/GeneticValueType";
import { TimeResolution } from "../../common/models/markets/TimeResolution";


/** Do *NOT* change this value! */
export const DEFAULT_BOT_IMPL = "genetic-bot.vanilla.v1";

export const DEFAULT_GENETICS: { [key: string]: Chromosome } = Object.freeze({
    "META": new Chromosome("META", "Meta", "Phenotype metadata", [
        new Gene<string>("IMPL", GeneticValueType.STRING, DEFAULT_BOT_IMPL, "Bot implementation variant to use"),
    ]),
    "TIME": new Chromosome("TIME", "Time", "Controls time related behaviour, notably time resolution", [
        new Gene<TimeResolution>("RES", GeneticValueType.TIME_RES, TimeResolution.FIFTEEN_MINUTES, "Specifies the time resolution to trade at, e.g. '1m', '15m', '1h', etc"),
    ]),
    "BUY": new Chromosome("BUY", "Buying", "Controls buying behaviour", [
        new Gene<number>("T", GeneticValueType.NUMBER, 1, "Threshold at which to consider a buy signal from the weighted average of other indicators"),
    ]),
    "SELL": new Chromosome("SELL", "Buying", "Controls selling behaviour", [
        new Gene<number>("T", GeneticValueType.NUMBER, 1, "Threshold at which to consider a sell signal from the weighted average of other indicators"),
    ]),
    "SYM": new Chromosome("SYM", "Symbols", "Controls which symbols to trade", []),
    "RSI": new Chromosome("RSI", "RSI", "Behaviour involving the Relative Strength Indictor", [
        new Gene("L", GeneticValueType.NUMBER, 33, "Lower RSI threshold to use as a buy signal"),
        new Gene("H", GeneticValueType.NUMBER, 66, "Upper RSI threshold to use as a sell signal"),
        new Gene("BW", GeneticValueType.NUMBER, 1, "Weighting for RSI buy signal"),
        new Gene("SW", GeneticValueType.NUMBER, 1, "Weighting for RSI sell signal"),
    ]),
    "BOLL": new Chromosome("BOLL", "Bollinger Bands", "Behaviour involving Bollinger Bands indicators", [
        new Gene("BB", GeneticValueType.FLAG, false, "Weighting (0 or 1) for buy signal on a breakout of the lower bound"),
        new Gene("SB", GeneticValueType.FLAG, false, "Weighting (0 or 1) for sell signal on a breakout of the upper bound"),
    ]),
})

Object.keys(DEFAULT_GENETICS)
    .map(k => DEFAULT_GENETICS[k])
    .forEach(gene => Object.freeze(gene))
    ;