import ccxt from "ccxt";
import { Market } from "../models/markets/Market";
import { MutableEntity } from "../models/MutableEntity";


export class MarketEntity extends MutableEntity {
    baseSymbolId: string;
    quoteSymbolId: string;
    exchangeId: string;
    definition: ccxt.Market;


    constructor(row?: Partial<Market>) {
        super(row);

        if (row) {
            this.baseSymbolId = row.baseSymbolId;
            this.quoteSymbolId = row.quoteSymbolId;
            this.exchangeId = row.exchangeId;
            this.definition = JSON.parse(row.definition + "");
        }
    }

    static fromRow(row?: Partial<Market>) {
        return row ? new MarketEntity(row) : null;
    }
}
