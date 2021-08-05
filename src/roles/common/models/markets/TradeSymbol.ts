import { ImmutableModel } from "../ImmutableEntity";
import { MutableModel } from "../MutableEntity";


// NOTE: Used in database. Do NOT change these values!
// Additive changes only.
export enum TradeSymbolType {
    CRYPTO = "crypto",
    FIAT = "fiat",
    EQUITY = "equity",
};

export interface TradeSymbol extends ImmutableModel {
    // Note: Inherited property id represents the short name, e.g. BTC,
    // and inherited prop displayName represents full name.

    typeId: TradeSymbolType;

    // Unicode symbol for the currency
    sign: string;

    // Number of decimal units for display
    displayUnits: number;
}
