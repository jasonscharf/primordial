import { MutableModel } from "../MutableEntity";


/**
 * Represents an account on an exchange.
 */
export interface ExchangeAccount extends MutableModel {
    exchangeId: string;
    ownerId: string;
    name: string;
    encryptedCred1: string;
    encryptedCred2?: string;
}
