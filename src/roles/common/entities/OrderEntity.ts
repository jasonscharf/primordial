import { Order, OrderState, OrderType } from "../models/markets/Order";
import { Money } from "../numbers";
import { MutableEntity } from "../models/MutableEntity";


export class OrderEntity extends MutableEntity implements Order {
    botRunId: string;
    baseSymbolId: string;
    quoteSymbolId: string;
    stopLossOrderId?: string;
    relatedOrderId?: string;
    orderTime: Date;
    exchangeId: string;
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


    constructor(row?: Partial<Order>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.botRunId = row[prefix + "botRunId"];
            this.baseSymbolId = row[prefix + "baseSymbolId"];
            this.quoteSymbolId = row[prefix + "quoteSymbolId"];
            this.exchangeId = row[prefix + "exchangeId"];
            this.stopLossOrderId = row[prefix + "stopLossOrderId"];
            this.relatedOrderId = row[prefix + "relatedOrderId"];
            this.extOrderId = row[prefix + "extOrderId"];
            this.orderTime = row[prefix + "orderTime"];
            this.stateId = row[prefix + "stateId"];
            this.typeId = row[prefix + "typeId"];
            this.opened = row[prefix + "opened"];
            this.closed = row[prefix + "closed"];
            this.quantity = Money(row[prefix + "quantity"]);
            this.price = Money(row[prefix + "price"]);
            this.gross = Money(row[prefix + "gross"]);
            this.fees = Money(row[prefix + "fees"]);
            this.strike = Money(row[prefix + "strike"]);
            this.limit = Money(row[prefix + "limit"]);
            this.stop = Money(row[prefix + "stop"]);
        }
    }

    static get cols() {
        return [
            ...MutableEntity.cols,
            "botRunId",
            "baseSymbolId",
            "quoteSymbolId",
            "exchangeId",
            "stopLossOrderId",
            "relatedOrderId",
            "extOrderId",
            "orderTime",
            "stateId",
            "typeId",
            "opened",
            "closed",
            "quantity",
            "price",
            "gross",
            "fees",
            "strike",
            "limit",
            "stop",
        ];
    }

    static fromRow(row?: Partial<Order>, prefix = "") {
        return row ? new OrderEntity(row, prefix) : null;
    }
}
