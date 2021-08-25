import { MutableModel } from "../MutableEntity";


/**
 * Represents an Allocation: essentially a budget given to a strategy to use.
 * Allocations are constituted by AllocationItems, which are line items representing assets in the allocation,
 * for example an allocation may contain 5 BTC, 10 ETH, etc.
 */
export interface Allocation extends MutableModel {
    strategyId: string;
    maxDrawdownPct: number;
    live: boolean;
}
