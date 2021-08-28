import { AllocationTransaction } from "../models/capital/AllocationTransaction";
import { AllocationTransactionType } from "../models/capital/AllocationTransactionType";
import { MutableEntity } from "../models/MutableEntity";
import { Money } from "../numbers";


export class AllocationTransactionEntity extends MutableEntity implements AllocationTransaction {
    allocationItemId: string;
    amount: Money;
    orderId?: string;
    typeId: AllocationTransactionType;


    constructor(row?: Partial<AllocationTransaction>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.allocationItemId = row[prefix + "allocationItemId"];
            this.amount = Money(row[prefix + "amount"]);
            this.orderId = row[prefix + "orderId"];
            this.typeId = row[prefix + "typeId"];
        }
    }

    static fromRow(row?: Partial<AllocationTransaction>) {
        return row ? new AllocationTransactionEntity(row) : null;
    }
}
