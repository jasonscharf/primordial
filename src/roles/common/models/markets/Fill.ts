import { Money } from "../../numbers";
import { ImmutableModel } from "../ImmutableEntity";


export interface Fill extends ImmutableModel {
    orderId: string;
    quantity: Money;
    price: Money;
}
