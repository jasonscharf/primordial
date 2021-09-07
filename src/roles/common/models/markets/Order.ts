import { Money } from "../../../common/numbers";
import { MutableModel } from "../MutableEntity";


export enum OrderState {
    OPEN = "open",
    FILLING = "filling",
    CANCELLED = "cancelled",
    CLOSED = "closed",
    ERROR = "error",
}

export enum OrderType {
    LIMIT_BUY = "buy.limit",
    LIMIT_SELL = "sell.limit",
    MARKET_BUY = "buy.market",
    MARKET_SELL = "sell.market",
}

export interface Order extends MutableModel {
    botRunId: string;
    baseSymbolId: string;
    quoteSymbolId: string;
    exchangeId: string;
    stopLossOrderId?: string;
    relatedOrderId?: string;
    //orderTime?: Date;
    extOrderId: string;
    stateId: OrderState;
    typeId: OrderType;
    opened?: Date;
    closed?: Date;
    quantity: Money;
    price: Money;
    gross: Money;
    fees: Money;
    strike: Money;
    limit: Money;
    stop: Money;
}
