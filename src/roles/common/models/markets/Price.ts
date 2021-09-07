import { Money } from "../../numbers";


// NOTE: Does not extend ImmutableModel, as there is no "id" key in prices.
export interface Price {
    baseSymbolId: string;
    quoteSymbolId: string
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
}
