import { Money } from "../../../common/numbers";
import { MutableModel } from "../MutableEntity";


export enum OrderState {
    OPEN = "open",
    FILLING = "filling",
    CANCELLED= "cancelled",
    CLOSED = "closed",
    ERROR = "error",
}

export interface Order extends MutableModel {
    botRunId: string;
    baseSymbolId: string;
    quoteSymbolId: string;
    exchangeId: string;
    stopLossOrderId?: string;
    relatedOrderId?: string;
    extOrderId: string;
    stateId: OrderState;
    quantity: Money;
    price: Money;
    gross: Money;
    fees: Money;
    strike: Money;
    limit: Money;
    stop: Money;
}
