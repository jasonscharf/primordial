import { Money } from "../../common/numbers";
import { Price } from "../models/markets/Price";


export class PriceEntity implements Price {
    baseSymbolId: string;
    quoteSymbolId: string;
    exchangeId: string;
    resId: string;
    ts: Date;
    open: Money;
    high: Money;
    low: Money;
    close: Money;
    volume: Money;
    openRaw: string;
    highRaw: string;
    lowRaw: string;
    closeRaw: string;


    constructor(row?: Partial<Price>) {
        if (row) {
            this.baseSymbolId = row.baseSymbolId;
            this.quoteSymbolId = row.quoteSymbolId;
            this.exchangeId = row.exchangeId;
            this.resId = row.resId;
            this.ts = row.ts;
            this.open = Money(row.open);
            this.high = Money(row.high);
            this.low = Money(row.low);
            this.close = Money(row.close);
            this.volume = Money(row.volume);
            this.openRaw = row.openRaw;
            this.highRaw = row.highRaw;
            this.lowRaw = row.lowRaw;
            this.closeRaw = row.closeRaw;
        }
    }

    static fromRow(row?: Partial<Price>) {
        return row ? new PriceEntity(row) : null;
    }
}
