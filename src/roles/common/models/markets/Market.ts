import ccxt from "ccxt";
import { MutableModel } from "../MutableEntity";


export interface Market extends MutableModel {
    baseSymbolId: string;
    quoteSymbolId: string;
    exchangeId: string;
    definition: ccxt.Market;
}
