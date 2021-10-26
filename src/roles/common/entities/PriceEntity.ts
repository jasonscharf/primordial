import { BigNum } from "../../common/numbers";
import { Price } from "../models/markets/Price";
import { from } from "../utils/time";


export class PriceEntity implements Price {
    baseSymbolId: string;
    quoteSymbolId: string;
    exchangeId: string;
    resId: string;
    ts: Date;
    open: BigNum;
    high: BigNum;
    low: BigNum;
    close: BigNum;
    volume: BigNum;
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
            this.ts = from(row.ts);
            this.open = BigNum(row.open);
            this.high = BigNum(row.high);
            this.low = BigNum(row.low);
            this.close = BigNum(row.close);
            this.volume = BigNum(row.volume);
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
