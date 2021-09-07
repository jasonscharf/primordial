import ccxt from "ccxt";
import { AssetAmount } from "../../common/models/capital/AssetAmount";
import { Order } from "../../common/models/markets/Order";


/**
 * Represents a request to perform a bot backtest.
 */
export interface BacktestRequest {
     from: Date;
     to: Date;
     name: string;
     genome: string;
     budget: AssetAmount[];
     remove: boolean;
     symbols: string;
     maxWagerPct: number;
}
