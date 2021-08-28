import { AllocationItem } from "../models/capital/AllocationItem";
import { MutableEntity } from "../models/MutableEntity";
import { Money } from "../numbers";


export class AllocationItemEntity extends MutableEntity implements AllocationItem {
    allocationId: string;
    symbolId: string;
    amount: Money;
    maxWagerPct: number;


    constructor(row?: Partial<AllocationItem>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.allocationId = row[prefix + "allocationId"];
            this.symbolId = row[prefix + "symbolId"];
            this.amount = Money(row[prefix + "amount"]);
            this.maxWagerPct = parseFloat(row[prefix + "maxWagerPct"]);
        }
    }

    static fromRow(row?: Partial<AllocationItem>) {
        return row ? new AllocationItemEntity(row) : null;
    }
}
