import { Money } from "../../numbers";
import { Order } from "../markets/Order";
import { PriceDataRange } from "../../../common-backend/services/SymbolService";
import { PrimoSerializableError } from "../../errors/errors";
import { TimeResolution } from "../markets/TimeResolution";


/**
 * Summary results for a particular bot instance.
 * Used for backtesting as well as reporting.
 */
export interface BotResultsSummary {
    instanceId: string;
    runId: string;
    name: string;
    capital: number;
    balance: number;
    totalGross: number;
    totalGrossPct: number;
    buyAndHoldGrossPct: number;
    estProfitPerYearCompounded: number;
    avgProfitPerDay: number;
    avgProfitPctPerDay: number;
    exchange: string;
    symbols: string;
    base: string;
    quote: string;
    numCandles: number;
    numOrders: number;
    numTrades: number;
    totalWins: number;
    totalLosses: number;
    avgWinRate: number;
    firstClose: number;
    lastClose: number;
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
    missingRanges: PriceDataRange[];
    orders: Order[];
    trailingOrder?: Order;
}
