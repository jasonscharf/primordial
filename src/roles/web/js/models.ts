import { BotRunReport } from "../../common/models/bots/BotSummaryResults";
import { Price } from "../../common/models/markets/Price";
import { BotInstance } from "./client";


export interface DataPoint {
    ts: Date;
    open: number;
    low: number;
    high: number;
    close: number;
    volume: number;
    signal: number;
    indicators: { [key: string]: number };
}

// TODO: Move
export interface ApiBotResultsApiResponse {
    instance: BotInstance;
    report: BotRunReport;
    prices: Price[];
    signals: number[];
    indicators: IndicatorMap;

    // For convenience, prices transformed by the client
    data?: Candle[];
    eventMap?: any;
}

export type IndicatorMap = Map<string, Map<string, number>>;


export interface Candle {
    ts: Date;
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
    eventMap: any;
    indicators: IndicatorMap;
    displayHeikinAshi?: boolean;
}

