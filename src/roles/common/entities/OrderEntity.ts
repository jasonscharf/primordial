import { Order, OrderState } from "../models/markets/Order";
import { Money } from "../numbers";
import { MutableEntity } from "../models/MutableEntity";


export class OrderEntity extends MutableEntity implements Order {
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


    constructor(row?: Partial<Order>) {
        super(row);

        if (row) {
            this.botRunId = row.botRunId;
            this.baseSymbolId = row.baseSymbolId;
            this.quoteSymbolId = row.quoteSymbolId;
            this.exchangeId = row.exchangeId;
            this.stopLossOrderId = row.stopLossOrderId;
            this.relatedOrderId = row.relatedOrderId;
            this.extOrderId = row.extOrderId;
            this.stateId = row.stateId;
            this.quantity = row.quantity;
            this.price = row.price;
            this.gross = row.gross;
            this.fees = row.fees;
            this.strike = row.strike;
            this.limit = row.limit;
            this.stop = row.stop;
        }
    }

    static fromRow(row?: Partial<Order>) {
        return row ? new OrderEntity(row) : null;
    }
}
