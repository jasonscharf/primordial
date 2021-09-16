import { ImmutableModel } from "../ImmutableEntity";
import { Money } from "../../numbers";


/**
 * Represents a fee associated with an order.
 */
export interface PrimoFee extends ImmutableModel {
    id: string;
    orderId: string;
    assetId: string;
    amount: Money;
    rate: Money;
}
