import { Chromosome } from "../../common/models/genetics/Chromosome";
import { Gene } from "../../common/models/genetics/Gene";
import { GeneticValueType } from "../../common/models/genetics/GeneticValueType";
import { RsiIndicatorChromosome } from "../indicators/RSI";
import { TimeResolution } from "../../common/models/markets/TimeResolution";


/** Do *NOT* change this value! */
export const DEFAULT_BOT_IMPL = "genetic-bot.vanilla.v1";

export const DEFAULT_PROFIT_TARGET = 0.02;
export const DEFAULT_STOPLOSS_ABS = -0.01;

export const enum names {
    GENETICS_C_META = "META",
    GENETICS_C_META_G_IMPL = "IMPL",
    GENETICS_C_TIME = "TIME",
    GENETICS_C_TIME_G_RES = "RES",
    GENETICS_C_TIME_G_MAX_INTERVALS = "MI",
    GENETICS_C_PROFIT = "PRF",
    GENETICS_C_PROFIT_G_TARGET = "TGT",
    GENETICS_C_STOPLOSS = "SL",
    GENETICS_C_STOPLOSS_G_ABS = "ABS",
    GENETICS_C_BUY = "BUY",
    GENETICS_C_BUY_G_THRESHOLD = "T",
    GENETICS_C_SELL = "SELL",
    GENETICS_C_SELL_G_THRESHOLD = "T",
    GENETICS_C_SYM = "SYM",
    GENETICS_C_RSI = "RSI",
    GENETICS_C_RSI_G_L = "L",
    GENETICS_C_RSI_G_H = "H",
    GENETICS_C_RSI_G_WL = "WL",
    GENETICS_C_RSI_G_BW = "BW",
    GENETICS_C_RSI_G_SW = "SW",
    GENETICS_C_RSI_G_OITP = "OITP",
    GENETICS_C_BOLL = "BOLL",
    GENETICS_C_BOLL_G_BUY_BREAKOUTS = "BB",
    GENETICS_C_BOLL_G_SELL_BREAKOUTS = "SB",
}


export const DEFAULT_GENETICS: { [key: string]: Chromosome } = Object.freeze({
    [names.GENETICS_C_META]: new Chromosome(names.GENETICS_C_META, "Meta", "Phenotype metadata", [
        new Gene<string>(names.GENETICS_C_META_G_IMPL, GeneticValueType.STRING, DEFAULT_BOT_IMPL, "Bot implementation variant to use"),
    ]),
    [names.GENETICS_C_TIME]: new Chromosome(names.GENETICS_C_TIME, "Time", "Controls time related behaviour, notably time resolution", [
        new Gene<TimeResolution>(names.GENETICS_C_TIME_G_RES, GeneticValueType.TIME_RES, TimeResolution.FIFTEEN_MINUTES, "Specifies the time resolution to trade at, e.g. '1m', '15m', '1h', etc"),


        new Gene<number>(names.GENETICS_C_TIME_G_MAX_INTERVALS, GeneticValueType.NUMBER, 99, "Specifies the number of previous intervals available for indicators to consider"),


    ]),
    [names.GENETICS_C_PROFIT]: new Chromosome(names.GENETICS_C_PROFIT, "Profit", "Controls profit targets and take-profits", [
        new Gene<number>(names.GENETICS_C_PROFIT_G_TARGET, GeneticValueType.NUMBER, DEFAULT_PROFIT_TARGET, "Controls the default profit target"),
    ]),
    [names.GENETICS_C_STOPLOSS]: new Chromosome(names.GENETICS_C_STOPLOSS, "Stop-loss", "Controls stop-losses", [
        new Gene<number>(names.GENETICS_C_STOPLOSS_G_ABS, GeneticValueType.NUMBER, DEFAULT_STOPLOSS_ABS, "Sets an initial absolute stop-loss when buy orders are placed"),
    ]),
    [names.GENETICS_C_BUY]: new Chromosome(names.GENETICS_C_BUY, "Buying", "Controls buying behaviour", [
        new Gene<number>(names.GENETICS_C_BUY_G_THRESHOLD, GeneticValueType.NUMBER, 1, "Signal threshold [0, 1] at which to consider a signal buyable"),
    ]),
    [names.GENETICS_C_SELL]: new Chromosome(names.GENETICS_C_SELL, "Buying", "Controls selling behaviour", [
        new Gene<number>(names.GENETICS_C_SELL_G_THRESHOLD, GeneticValueType.NUMBER, -1, "Signal threshold [0, 1] at whicht o consider a signal sellable"),
    ]),
    [names.GENETICS_C_SYM]: new Chromosome(names.GENETICS_C_SYM, "Symbols", "Controls which symbols to trade", []),
    [names.GENETICS_C_RSI]: new RsiIndicatorChromosome(names.GENETICS_C_RSI, "RSI", "Behaviour involving the Relative Strength Indictor", [
        new Gene(names.GENETICS_C_RSI_G_L, GeneticValueType.NUMBER, 33, "Lower RSI threshold to use as a buy signal"),
        new Gene(names.GENETICS_C_RSI_G_H, GeneticValueType.NUMBER, 66, "Upper RSI threshold to use as a sell signal"),
        new Gene(names.GENETICS_C_RSI_G_WL, GeneticValueType.NUMBER, 99, "Window length of closed intervals to consider"),
        new Gene(names.GENETICS_C_RSI_G_BW, GeneticValueType.NUMBER, 1, "Weighting for RSI buy signal"),
        new Gene(names.GENETICS_C_RSI_G_SW, GeneticValueType.NUMBER, 1, "Weighting for RSI sell signal"),
        new Gene(names.GENETICS_C_RSI_G_OITP, GeneticValueType.NUMBER, 14, "Opt-in time period for RSI"),
    ]),
    [names.GENETICS_C_BOLL]: new Chromosome(names.GENETICS_C_BOLL, "Bollinger Bands", "Behaviour involving Bollinger Bands indicators", [
        new Gene(names.GENETICS_C_BOLL_G_BUY_BREAKOUTS, GeneticValueType.FLAG, false, "Emit buy signal on a breakout of the lower bound"),
        new Gene(names.GENETICS_C_BOLL_G_SELL_BREAKOUTS, GeneticValueType.FLAG, false, "Emit sell signal on a breakout of the upper bound"),
    ]),
});

Object.keys(DEFAULT_GENETICS)
    .map(k => DEFAULT_GENETICS[k])
    .forEach(gene => Object.freeze(gene))
    ;
