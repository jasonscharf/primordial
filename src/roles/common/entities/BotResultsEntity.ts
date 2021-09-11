import { BotResults } from "../models/bots/BotResults";
import { BotResultsSummary } from "../../common-backend/bots/BotSummaryResults";
import { MutableEntity } from "../models/MutableEntity";


export class BotResultsEntity extends MutableEntity implements BotResults {
    botRunId: string;
    exchangeId: string;
    baseSymbolId: string;
    quoteSymbolId: string;
    from: Date;
    to: Date;
    results: BotResultsSummary;


    constructor(row?: Partial<BotResults>, prefix = "") {
        super(row);

        if (row) {
            this.botRunId = row[prefix + "botRunId"];
            this.exchangeId = row[prefix + "exchangeId"];
            this.baseSymbolId = row[prefix + "baseSymbolId"];
            this.quoteSymbolId = row[prefix + "quoteSymbolId"];
            this.from = row[prefix + "from"];
            this.to = row[prefix + "to"];
            this.results = row[prefix + "results"];
        }
    }

    static fromRow(row?: Partial<BotResults>) {
        return row ? new BotResultsEntity(row) : null;
    }
}
