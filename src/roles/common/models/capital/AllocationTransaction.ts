import { AllocationTransactionType } from "./AllocationTransactionType";
import { Money } from "../../numbers";
import { MutableModel } from "../MutableEntity";


/**
 * Represents consumption of an allocation item, e.g. consuming 1 BTC from an allocation item of 5 BTC.
 */
export interface AllocationTransaction extends MutableModel {
    allocationItemId: string;
    amount: Money;
    orderId?: string;
    typeId: AllocationTransactionType;
}
