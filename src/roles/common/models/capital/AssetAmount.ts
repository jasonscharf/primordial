import { Money } from "../../numbers";
import { TradeSymbol } from "../markets/TradeSymbol";


/**
 * Represents an amount of some known asset.
 */
export interface AssetAmount {
    quantity: Money;
    symbol: TradeSymbol;
}
