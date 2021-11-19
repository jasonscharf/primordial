import { BigNum } from "../numbers";
import { BotRun } from "../models/bots/BotRun";
import { BotRunReport } from "../models/bots/BotSummaryResults";
import { ImmutableEntity } from "../models";
import { Order } from "../models/markets/Order";
import { OrderEntity } from "./OrderEntity";
import { PrimoSerializableError } from "../errors/errors";
import { PriceDataRange } from "../../common-backend/services/SymbolService";
import { TimeResolution } from "../models/markets/TimeResolution";
import { from } from "../utils/time";


/**
 * Represents a run report for a backtest or forward/live run.
 * Does not bear an ID, therefore does not extent ImmutableEntity.
 */
export class BotRunReportEntity /* extends ImmutableEntity */ implements BotRunReport {
    instanceId: string;
    runId: string;
    name: string;
    capital: BigNum;
    balance: BigNum;
    totalGross: BigNum;
    totalGrossPct: number;
    buyAndHoldGrossPct: number;
    estProfitPerYearCompounded: BigNum;
    avgProfitPerDay: BigNum;
    avgProfitPctPerDay: number;
    totalFees: BigNum;
    totalProfit: BigNum;
    totalProfitPct: number;
    drawdownPct: number;
    maxDrawdownPct: number;
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


    constructor(row?: Partial<BotRunReport>, prefix = "") {
        if (row) {
            this.instanceId = row[prefix + "instanceId"];
            this.runId = row[prefix + "runId"];
            this.name = row[prefix + "name"];
            this.capital = BigNum(row[prefix + "capital"]);
            this.balance = BigNum(row[prefix + "balance"]);
            this.totalGross = BigNum(row[prefix + "totalGross"]);
            this.totalGrossPct = row[prefix + "totalGrossPct"];
            this.buyAndHoldGrossPct = row[prefix + "buyAndHoldGrossPct"];
            this.estProfitPerYearCompounded = BigNum(row[prefix + "estProfitPerYearCompounded"]);
            this.avgProfitPerDay = BigNum(row[prefix + "avgProfitPerDay"]);
            this.avgProfitPctPerDay = row[prefix + "avgProfitPctPerDay"];
            this.totalFees = BigNum(row[prefix + "totalFees"]);
            this.totalProfit = BigNum(row[prefix + "totalProfit"]);
            this.totalProfitPct = row[prefix + "totalProfitPct"];
            this.drawdownPct = row[prefix + "drawdownPct"];
            this.maxDrawdownPct = row[prefix + "maxDrawdownPct"];
            this.exchange = row[prefix + "exchange"];
            this.symbols = row[prefix + "symbols"];
            this.base = row[prefix + "base"];
            this.quote = row[prefix + "quote"];
            this.window = row[prefix + "window"];
            this.numCandles = row[prefix + "numCandles"];
            this.numOrders = row[prefix + "numOrders"];
            this.numTrades = row[prefix + "numTrades"];
            this.totalWins = row[prefix + "totalWins"];
            this.totalLosses = row[prefix + "totalLosses"];
            this.avgWinRate = row[prefix + "avgWinRate"];
            this.firstOpen = BigNum(row[prefix + "firstOpen"] ?? "0");
            this.firstClose = BigNum(row[prefix + "firstClose"] ?? "0");
            this.lastClose = BigNum(row[prefix + "lastClose"] ?? "0");
            this.sharpe = row[prefix + "sharpe"];
            this.sortino = row[prefix + "sortino"];
            this.from = from(row[prefix + "from"]);
            this.to = from(row[prefix + "to"]);
            this.start = from(row[prefix + "start"]);
            this.finish = from(row[prefix + "finish"]);
            this.durationMs = row[prefix + "durationMs"];
            this.length = row[prefix + "length"];
            this.genome = row[prefix + "genome"];
            this.timeRes = row[prefix + "timeRes"];
            this.error = row[prefix + "error"];
            this.signals = row[prefix + "signals"];
            this.indicators = row[prefix + "indicators"];
            this.missingRanges = row[prefix + "missingRanges"];


            const orders = row[prefix + "orders"];
            const trailingOrder = row[prefix + "trailingOrder"];

            if (!orders) {
                this.orders = [];
            }
            else {
                this.orders = orders.map(o => OrderEntity.fromRow(o));
            }

            if (!trailingOrder) {
                this.trailingOrder = null;
            }
            else {
                this.trailingOrder = OrderEntity.fromRow(trailingOrder);
            }
        }
    }

    static get cols() {
        return [
            ...ImmutableEntity.cols,
            "instanceId",
            "runId",
            "name",
            "capital",
            "balance",
            "totalGross",
            "totalGrossPct",
            "buyAndHoldGrossPct",
            "estProfitPerYearCompounded",
            "avgProfitPerDay",
            "avgProfitPctPerDay",
            "totalFees",
            "totalProfit",
            "totalProfitPct",
            "drawdownPct",
            "maxDrawdownPct",
            "exchange",
            "symbols",
            "base",
            "quote",
            "window",
            "numCandles",
            "numOrders",
            "numTrades",
            "totalWins",
            "totalLosses",
            "avgWinRate",
            "firstOpen",
            "firstClose",
            "lastClose",
            "sharpe",
            "sortino",
            "from",
            "to",
            "start",
            "finish",
            "durationMs",
            "length",
            "genome",
            "timeRes",
            "error",
            "signals",
            "indicators",
            "missingRanges",
            "orders",
            "trailingOrder",
        ];
    }

    static fromRow(row?: Partial<BotRun>, prefix = "") {
        return row ? new BotRunReportEntity(row, prefix) : null;
    }
}
