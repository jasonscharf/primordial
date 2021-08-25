import { Money } from "../../numbers";
import { MutableModel } from "../MutableEntity";


/**
 * Represents a line item in an allocation, e.g. "5 BTC"
 */
export interface AllocationItem extends MutableModel {
    allocationId: string;
    symbolId: string;
    amount: Money;
    maxWagerPct: number;
}
