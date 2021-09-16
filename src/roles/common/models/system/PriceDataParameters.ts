import { TimeResolution } from "../markets/TimeResolution";


export interface PriceDataParameters {
    exchange: string;
    symbolPair: string;
    res: TimeResolution,
    from: Date,
    to?: Date,
    fetchDelay?: number;
    fillMissing?: boolean;
}
