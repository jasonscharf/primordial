import { AssetAmount } from "../../common/models/capital/AssetAmount";
import { Order } from "../../common/models/markets/Order";
import { SerializablePrimoError } from "../../common/errors/errors";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { Money } from "../../common/numbers";


/**
 * Summary results of a backtest.
 */
export interface BacktestResults {
    instanceId: string;
    name: string;
    capital: Money;
    balance: Money;
    totalGross: Money;
    totalGrossPct: number;
    buyAndHoldGrossPct: number;
    avgProfitPerDay: number;
    avgProfitPctPerDay: number;
    symbols: string;
    numCandles: number;
    numOrders: number;
    numTrades: number;
    totalWins: number;
    totalLosses: number;
    avgWinRate: number;
    firstClose: Money;
    lastClose: Money;
    sharpe: number;
    sortino: number;
    from: Date;
    to: Date;
    start: Date;
    finish: Date;
    durationMs: number;
    length: string;
    genome: string;
    timeRes: TimeResolution;
    error?: SerializablePrimoError;
    orders: Order[];
    trailingOrder?: Order;
}
