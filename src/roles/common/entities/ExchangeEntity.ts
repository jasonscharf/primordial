import { Exchange } from "../models/markets/Exchange";
import { MutableEntity } from "../models/MutableEntity";


/**
 * Database record for an asset exchange or market, e.g. Binance, NYSE, DOW, etc.
 */
export class ExchangeEntity extends MutableEntity implements Exchange {

    constructor(row?: Partial<Exchange>) {
        super(row);
    }

    static fromRow(row?: Partial<Exchange>) {
        return row ? new ExchangeEntity(row) : null;
    }
}
