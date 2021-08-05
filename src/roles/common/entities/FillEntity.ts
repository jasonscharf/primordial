import { Fill } from "../models/markets/Fill";
import { Money } from "../numbers";
import { ImmutableEntity } from "../models/ImmutableEntity";


export class FillEntity extends ImmutableEntity implements Fill {
    orderId: string;
    quantity: Money;
    price: Money;


    constructor(row?: Partial<Fill>) {
        super(row);

        if (row) {
            this.orderId = row.orderId;
            this.quantity = row.quantity;
            this.price = row.price;
        }
    }

    static fromRow(row?: Partial<Fill>) {
        return row ? new FillEntity(row) : null;
    }
}
