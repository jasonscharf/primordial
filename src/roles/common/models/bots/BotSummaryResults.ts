import { BigNum } from "../../numbers";
import { Order } from "../markets/Order";
import { PriceDataRange } from "../../../common-backend/services/SymbolService";
import { PrimoSerializableError } from "../../errors/errors";
import { TimeResolution } from "../markets/TimeResolution";



/**
 * Summary results for a particular bot instance.
 * Used for backtesting as well as reporting.
 */
export interface BotRunReport {
    instanceId: string;
    runId: string;
    name: string;
    capital: BigNum;
    balance: BigNum;
    totalGross: BigNum;
    totalGrossPct: number;
    drawdownPct: number;
    buyAndHoldGrossPct: number;
    estProfitPerYearCompounded: BigNum;
    avgProfitPerDay: BigNum;
    avgProfitPctPerDay: number;
    totalFees: BigNum;
    totalProfit: BigNum;
    totalProfitPct: number;
    exchange: string;
    symbols: string;
    base: string;
    quote: string;
    window: number;
    numCandles: number;
    numOrders: number;
    numTrades: number;
    totalWins: number;
    totalLosses: number;
    avgWinRate: number;
    firstOpen: BigNum;
    firstClose: BigNum;
    lastClose: BigNum;
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
    error?: PrimoSerializableError;
    signals: number[];
    indicators: {};
    missingRanges: PriceDataRange[];
    orders: Order[];
    trailingOrder?: Order;
}
