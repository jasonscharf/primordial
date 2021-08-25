import { Allocation } from "../models/capital/Allocation";
import { MutableEntity } from "../models/MutableEntity";


export class AllocationEntity extends MutableEntity implements Allocation {
    strategyId: string;
    maxDrawdownPct: number;
    live: boolean;


    constructor(row?: Partial<Allocation>, prefix = "") {
        super(row);

        if (row) {
            this.strategyId = row[prefix + "strategyId"];
            this.maxDrawdownPct = parseFloat(row[prefix + "maxDrawdownPct"]);
            this.live = row[prefix + "live"];
        }
    }

    static fromRow(row?: Partial<Allocation>) {
        return row ? new AllocationEntity(row) : null;
    }
}
