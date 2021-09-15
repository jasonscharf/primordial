import { BotRunReport } from "./BotSummaryResults";
import { MutableModel } from "../MutableEntity";


/**
 * Represnts a saved result summary for a particular bot run.
 */
export interface BotResults extends MutableModel {
    botRunId: string;
    exchangeId: string;
    baseSymbolId: string;
    quoteSymbolId: string;
    from: Date;
    to: Date;
    results: BotRunReport;
}
