/**
 * Describes the fundamental type of a transaction.
 */
export enum AllocationTransactionType {
    CREDIT = "credit",
    DEBIT = "debit",
    
    // Just a debit from a human
    FUND = "fund",
}
