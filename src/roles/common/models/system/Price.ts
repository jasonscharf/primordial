import { Money } from "../../numbers";
import { ImmutableModel } from "../ImmutableEntity";


// NOTE: Does not extend ImmutableModel, as there is no "id" key in prices.
export interface Price {
    baseSymbolId: string;
    quoteSymbolId: string
    exchangeId: string;
    ts: Date;
    open: Money;
    high: Money;
    low: Money;
    close: Money;
    volume: number;
    openRaw: string;
    highRaw: string;
    lowRaw: string;
    closeRaw: string;
}
