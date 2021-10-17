import ccxt from "ccxt";
import { Order } from "../../common/models/markets/Order";
import { Price } from "../../common/models/markets/Price";


/**
 * Represents update to a particular symbol.
 */
export interface PriceUpdateMessage extends Price {
}


/**
 * Represents a status change on an order, e.g. completion.
 */
export interface OrderStatusUpdateMessage {
     instanceId: string;
     exchangeOrder: ccxt.Order;
     primoOrder: Order;
}
