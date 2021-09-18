import { AssetAmount } from "../../common/models/capital/AssetAmount";
import { TimeResolution } from "../../common/models/markets/TimeResolution";


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
     res: TimeResolution;
     symbols: string;
     maxWagerPct: number;
}
