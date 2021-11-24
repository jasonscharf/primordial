import { BigNum } from "../numbers";
import { MutableEntity } from "../models/MutableEntity";
import { Order, OrderState, OrderType } from "../models/markets/Order";
import { from } from "../utils/time";


export class OrderEntity extends MutableEntity implements Order {
    botRunId: string;
    baseSymbolId: string;
    quoteSymbolId: string;
    stopLossOrderId?: string;
    relatedOrderId?: string;
    exchangeId: string;
    extOrderId: string;
    stateId: OrderState;
    typeId: OrderType;
    opened?: Date;
    closed?: Date;
    capital: BigNum;
    quantity: BigNum;
    price: BigNum;
    gross: BigNum;
    fees: BigNum;
    strike: BigNum;
    limit: BigNum;
    stop: BigNum;


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
            this.stateId = row[prefix + "stateId"];
            this.typeId = row[prefix + "typeId"];
            this.opened = from(row[prefix + "opened"]);
            this.closed = from(row[prefix + "closed"]);
            this.capital = BigNum(row[prefix + "capital"] ?? "0");
            this.quantity = BigNum(row[prefix + "quantity"] ?? "0");
            this.price = BigNum(row[prefix + "price"] ?? "0");
            this.gross = BigNum(row[prefix + "gross"] ?? "0");
            this.fees = BigNum(row[prefix + "fees"] ?? "0");
            this.strike = BigNum(row[prefix + "strike"] ?? "0");
            this.limit = BigNum(row[prefix + "limit"] ?? "0");
            this.stop = BigNum(row[prefix + "stop"] ?? "0");
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
            "stateId",
            "typeId",
            "opened",
            "closed",
            "capital",
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
