import { BigNum } from "../BigNum";
import { Money } from "../../numbers";


// NOTE: Does not extend ImmutableModel, as there is no "id" key in prices.
export interface Price {
    baseSymbolId: string;
    quoteSymbolId: string
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
}
