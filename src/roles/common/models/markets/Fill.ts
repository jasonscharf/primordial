import { BigNum } from "../BigNum";
import { ImmutableModel } from "../ImmutableEntity";
import { Money } from "../../numbers";


export interface Fill extends ImmutableModel {
    orderId: string;
    quantity: BigNum;
    price: BigNum;
}
