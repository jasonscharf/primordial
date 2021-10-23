import { AllocationTransaction } from "../models/capital/AllocationTransaction";
import { AllocationTransactionType } from "../models/capital/AllocationTransactionType";
import { BigNum } from "../numbers";
import { MutableEntity } from "../models/MutableEntity";


export class AllocationTransactionEntity extends MutableEntity implements AllocationTransaction {
    allocationItemId: string;
    amount: BigNum;
    orderId?: string;
    typeId: AllocationTransactionType;


    constructor(row?: Partial<AllocationTransaction>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.allocationItemId = row[prefix + "allocationItemId"];
            this.amount = BigNum(row[prefix + "amount"]);
            this.orderId = row[prefix + "orderId"];
            this.typeId = row[prefix + "typeId"];
        }
    }

    static fromRow(row?: Partial<AllocationTransaction>) {
        return row ? new AllocationTransactionEntity(row) : null;
    }
}
