import ccxt from "ccxt";
import { Order } from "../../common/models/markets/Order";
import { Price } from "../../common/models/system/Price";


/**
 * Represents update to a particular symbol.
 */
export interface PriceUpdateMessage extends Partial<Price> {
}


/**
 * Represents a status change on an order, e.g. completion.
 */
export interface OrderStatusUpdateMessage {
     exchangeOrder: ccxt.Order;
     primoOrder: Order;
}
