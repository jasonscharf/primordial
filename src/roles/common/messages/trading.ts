/** These are interfaces from TSOA, which cannot represent external interfaces such as "Money". */

import { TimeResolution } from "../models/markets/TimeResolution";


/**
 * Mirrors BacktestRequest
 */
 export interface ApiBacktestRequest {
    from: string;
    to: string;
    genome: string;
    res: ApiTimeResolution;
    symbols: string;
    maxWagerPct?: number;
    remove?: boolean;
    name?: string;
    returnEarly?: boolean;
}

// FUN: TSOA capitalizes enum value names in keys for some silly reason, so "1m" and "1M" conflict...
// Dropping 1min, as it's not super useful anyways.
export type ApiTimeResolution = "5m" | "15m" | "1h" | "4h";

export interface ApiBacktestResponse {
    id: string;
    url: string;
}

/**
 * Mirrors AssetAmount
 */
export interface ApiAssetAmount {
    amount: number;
    symbol: string;
}

export interface ApiBacktestHandle {
    id: string;
    name: string;
}
