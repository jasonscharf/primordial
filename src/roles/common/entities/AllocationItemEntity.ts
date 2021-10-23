import BigNum from "../models/BigNum";
import { AllocationItem } from "../models/capital/AllocationItem";
import { MutableEntity } from "../models/MutableEntity";


export class AllocationItemEntity extends MutableEntity implements AllocationItem {
    allocationId: string;
    symbolId: string;
    amount: BigNum;
    maxWagerPct: number;


    constructor(row?: Partial<AllocationItem>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.allocationId = row[prefix + "allocationId"];
            this.symbolId = row[prefix + "symbolId"];
            this.amount = BigNum(row[prefix + "amount"]);
            this.maxWagerPct = parseFloat(row[prefix + "maxWagerPct"]);
        }
    }

    static fromRow(row?: Partial<AllocationItem>) {
        return row ? new AllocationItemEntity(row) : null;
    }
}
