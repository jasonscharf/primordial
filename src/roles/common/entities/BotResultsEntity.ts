import { BotResults } from "../models/bots/BotResults";
import { BotRunReport } from "../models/bots/BotSummaryResults";
import { BotRunReportEntity } from "./BotRunReportEntity";
import { MutableEntity } from "../models/MutableEntity";
import { OrderEntity } from "./OrderEntity";


export class BotResultsEntity extends MutableEntity implements BotResults {
    botRunId: string;
    exchangeId: string;
    baseSymbolId: string;
    quoteSymbolId: string;
    from: Date;
    to: Date;
    results: BotRunReport;


    constructor(row?: Partial<BotResults>, prefix = "") {
        super(row);

        if (row) {
            this.botRunId = row[prefix + "botRunId"];
            this.exchangeId = row[prefix + "exchangeId"];
            this.baseSymbolId = row[prefix + "baseSymbolId"];
            this.quoteSymbolId = row[prefix + "quoteSymbolId"];
            this.from = row[prefix + "from"];
            this.to = row[prefix + "to"];
            this.results = BotRunReportEntity.fromRow(row[prefix + "results"]);
        }
    }

    static fromRow(row?: Partial<BotResults>) {
        return row ? new BotResultsEntity(row) : null;
    }
}
