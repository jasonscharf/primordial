import { BotRunReport } from "../../common/models/bots/BotSummaryResults";
import { Price } from "../../common/models/markets/Price";


export interface DataPoint {
    ts: Date;
    date: Date;
    open: number;
    low: number;
    high: number;
    close: number;
    volume: number;
    signal: number;
    indicators: { [key: string]: number };
}

export interface BotResultsApiResponse {
    report: BotRunReport;
    prices: Price[];
    signals: number[];
    indicators: { [key: string]: number[] };
}

export type IndicatorMap = Map<Date, Map<string, number>>;


export interface Candle {
    date: Date;
    open: number;
    low: number;
    high: number;
    close: number;
    volume: number;
}


export interface BotChartProps {
    summary: BotRunReport;
    data: Candle[];
    height: number;
    dateTimeFormat?: string;
    width: number;
    ratio: number;
    signals: number[];
    indicators: IndicatorMap;
}

