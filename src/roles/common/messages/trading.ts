/** These are interfaces from TSOA, which cannot represent external interfaces such as "Money". */

import { BotDefinition } from "../models/bots/BotDefinition";
import { BotInstance } from "../models/bots/BotInstance";
import { BotRun } from "../models/bots/BotRun";
import { Order } from "../models/markets/Order";


// FUN: TSOA capitalizes enum value names in keys for some silly reason, so "1m" and "1M" conflict...
// TODO: Try and use correct enum
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

export interface ApiBotOrderDescriptor {
    def: Partial<BotDefinition>;
    instance: Partial<BotInstance>;
    run: Partial<BotRun>;
    order: Partial<Order>;
}
