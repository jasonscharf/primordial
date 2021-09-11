import { PrimoFee } from "../models/markets/Fee";
import { Fill } from "../models/markets/Fill";
import { ImmutableEntity } from "../models/ImmutableEntity";
import { Money } from "../numbers";


export class FeeEntity extends ImmutableEntity implements PrimoFee {
    orderId: string;
    assetId: string;
    amount: Money;
    rate: Money;


    constructor(row?: Partial<PrimoFee>) {
        super(row);

        if (row) {
            this.orderId = row.orderId;
            this.assetId = row.assetId;
            this.amount = Money(row.amount);
            this.rate = Money(row.rate);
        }
    }

    static fromRow(row?: Partial<Fill>) {
        return row ? new FeeEntity(row) : null;
    }
}
