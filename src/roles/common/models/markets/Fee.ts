import { BigNum } from "../../numbers";
import { ImmutableModel } from "../ImmutableEntity";


/**
 * Represents a fee associated with an order.
 */
export interface PrimoFee extends ImmutableModel {
    id: string;
    orderId: string;
    assetId: string;
    amount: BigNum;
    rate: BigNum;
}
