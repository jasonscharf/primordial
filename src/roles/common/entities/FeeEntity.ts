import { Fee } from "../models/markets/Fee";
import { Fill } from "../models/markets/Fill";
import { ImmutableEntity } from "../models/ImmutableEntity";
import { Money } from "../numbers";


export class FeeEntity extends ImmutableEntity implements Fee {
    orderId: string;
    assetId: string;
    amount: Money;
    rate: Money;


    constructor(row?: Partial<Fee>) {
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
