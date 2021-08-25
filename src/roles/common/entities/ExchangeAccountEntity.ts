import { ExchangeAccount } from "../models/markets/ExchangeAccount";
import { MutableEntity } from "../models/MutableEntity";


export class ExchangeAccountEntity extends MutableEntity implements ExchangeAccount {
    exchangeId: string;
    ownerId: string;
    name: string;
    encryptedCred1: string;
    encryptedCred2?: string;


    constructor(row: Partial<ExchangeAccount>, prefix = "") {
        super(row, prefix);

        if (row) {
            this.exchangeId = row[prefix + "exchangeId"];
            this.ownerId = row[prefix + "ownerId"];
            this.name = row[prefix + "name"];
            this.encryptedCred1 = row[prefix + "encryptedCred1"];
            this.encryptedCred2 = row[prefix + "encryptedCred2"];
        }
    }

    static fromRow(row: Partial<ExchangeAccount>, prefix = "") {
        return new ExchangeAccountEntity(row, prefix);
    }
}
