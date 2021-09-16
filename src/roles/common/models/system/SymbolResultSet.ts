import { Price } from "../markets/Price";
import { PriceDataRange } from "../../../common-backend/services/SymbolService";


export interface SymbolResultSet {
    warnings: string[];
    missingRanges: PriceDataRange[];
    prices: Price[];
}
