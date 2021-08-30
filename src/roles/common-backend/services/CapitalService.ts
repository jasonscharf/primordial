import { Knex } from "knex";
import { AllocationEntity } from "../../common/entities/AllocationEntity";
import { AllocationItemEntity } from "../../common/entities/AllocationItemEntity";
import { AllocationTransactionEntity } from "../../common/entities/AllocationTransaction";
import { Allocation } from "../../common/models/capital/Allocation";
import { AllocationItem } from "../../common/models/capital/AllocationItem";
import { AllocationTransaction } from "../../common/models/capital/AllocationTransaction";
import { AllocationTransactionType } from "../../common/models/capital/AllocationTransactionType";
import { AssetAmount } from "../../common/models/capital/AssetAmount";
import { Money } from "../../common/numbers";
import { botIdentifier } from "../bots/BotContext";
import { DEFAULT_ALLOCATION_DRAWDOWN_MAX_PCT, DEFAULT_ALLOCATION_MAX_WAGER, queries, tables } from "../constants";
import { db, strats } from "../includes";
import { query, ref } from "../database/utils";
import { sym } from "../services";


export interface AllocationOptions {
    name?: string;
    displayName?: string;
    requireFullAmount?: boolean;
    live?: boolean;
}

export const DEFAULT_ALLOC_OPTIONS: AllocationOptions = {
    requireFullAmount: false,
    live: false,
};

export interface AllocationLedger {
    alloc: Allocation;
    items: AllocationItem[];
    transactions: AllocationTransaction[];
}

export interface WidthdrawalArgs {
    botInstanceId: string;
    requestedAmount: Money;
}

/** 
 * Handles financial allocations and bookkeeping.
 */
export class CapitalService {

    /**
     * Parses a string such as "0.15 BTC" into a normalized AssetAmount.
     * Supports multiple asset amounts, e.g. "0.15 BTC, 8000 DOGE, 2500 TUSD"
     * Amounts can be positive or negative.
     */
    async parseAssetAmounts(amountsRaw: string): Promise<AssetAmount[]> {
        const pairsRaw = amountsRaw
            .split(/,/)
            .map(p => p.trim())
            ;

        const items: AssetAmount[] = [];
        for (const pair of pairsRaw) {
            const pieces = pair
                .trim()
                .split(/[ ]+/)
                .map(s => s.trim())
                ;
            if (pieces.length !== 2) {
                throw new Error(`Unknown amount/symbol pair '${pair}'`);
            }

            const [quantityRaw, symbol] = pieces;

            // Ideally symbols would be cached locally and "always" up to date with new ones.
            // For simplicity, for now, we'll just fetch from DB each time.
            const parsed: AssetAmount = {
                quantity: Money(quantityRaw),
                symbol: await sym.getSymbol(symbol),
            };

            if (parsed.symbol === null) {
                throw new Error(`Unknown symbol '${symbol}'`);
            }

            items.push(parsed);
        }

        return items;
    }

    /**
     * Returns the entire transaction history for an allocation and its items.
     * @param allocationId 
     * @param trx 
     * @returns 
     */
    async getAllocationLedger(allocationId: string, trx: Knex.Transaction = null): Promise<AllocationLedger> {
        const newTransaction = !trx;
        trx = trx || await db.transaction();

        try {
            const ledger: AllocationLedger = await query(queries.ALLOCS_GET_LEDGER, async db => {
                const [allocRow] = <Allocation[]>await db(tables.Allocations)
                    .where({ id: allocationId })
                    .select("*")
                    .limit(1)
                    ;

                const alloc: Allocation = AllocationEntity.fromRow(allocRow);

                const itemRows = <AllocationItem[]>await db(tables.AllocationItems)
                    .where({ allocationId })
                    .select("*")
                    .orderBy("created", "asc")
                    ;

                const items = itemRows.map(AllocationItemEntity.fromRow);

                const transactionRows = <AllocationTransaction[]>await db(tables.AllocationTransactions)
                    .innerJoin(tables.AllocationItems, ref(tables.AllocationTransactions, "allocationItemId"), ref(tables.AllocationItems))
                    .select(ref(tables.AllocationTransactions, "*"))
                    .orderBy("created", "asc")
                    ;

                const transactions = transactionRows.map(AllocationTransactionEntity.fromRow);
                return <AllocationLedger>{
                    alloc,
                    items,
                    transactions,
                };
            }, trx);

            if (newTransaction) {
                await trx.commit();
            }

            return ledger;
        }
        catch (err) {
            await trx.rollback();
            throw err;
        }
    }

    /**
     * Requests a withdrawal for a bot to make a purchase.
     */
    async requestWithdrawalForBotOrder(args: WidthdrawalArgs): Promise<AllocationTransaction> {
        const { botInstanceId } = args;
        return null;
    }

    async cancelWithdrawalForBot(transaction: AllocationTransaction) {
        // ...
    }

    calcCompoundingInterest(initial: Money, rate: number, periodsPerYear: number, years: number) {
        return initial.times((1 + (rate / periodsPerYear)) ^ (periodsPerYear * years));
    }


    /**
     * Creates an allocation for a bot, including an item and funding transaction on the ledger.
     * @param strategyId
     * @param allocStr
     * @param options
     * @param trx
     * @returns
     */
    async createAllocationForBot(strategyId: string, allocStr: string, options: AllocationOptions = DEFAULT_ALLOC_OPTIONS, trx: Knex.Transaction = null): Promise<AllocationLedger> {
        const newTransaction = !trx;
        trx = trx || await db.transaction();

        try {
            const amounts = await this.parseAssetAmounts(allocStr);

            let alloc: Allocation = null;
            let items: AllocationItem[] = [];
            let transactions: AllocationTransactionEntity[] = [];
            const res = await query(queries.ALLOCS_CREATE_TEST_ALLOC, async db => {
                const newAllocProps: Partial<Allocation> = {
                    strategyId,
                    live: options.live === true,
                    maxDrawdownPct: DEFAULT_ALLOCATION_DRAWDOWN_MAX_PCT,
                    displayName: `Bot allocation`,
                };

                // Create an allocation, items for each amount, and a funding transaction for each amount.
                const [newAllocRow] = <Allocation[]>await db(tables.Allocations)
                    .insert(newAllocProps)
                    .returning("*")
                    ;

                alloc = AllocationEntity.fromRow(newAllocRow);

                for (const amount of amounts) {
                    const { quantity, symbol } = amount;

                    const newAllocItemProps: Partial<AllocationItem> = {
                        allocationId: alloc.id,
                        amount: quantity.toString() as any as Money,
                        maxWagerPct: DEFAULT_ALLOCATION_MAX_WAGER,
                        symbolId: symbol.id,
                        displayName: `${amount} ${symbol}`,
                    };

                    const [newAllocItemRow] = <AllocationItem[]>await db(tables.AllocationItems)
                        .insert(newAllocItemProps)
                        .returning("*")
                        ;

                    const item = AllocationItemEntity.fromRow(newAllocItemRow);
                    items.push(item);

                    const newTransactionProps: Partial<AllocationTransaction> = {
                        displayName: `Fund w/ ${amount.quantity} ${symbol.id}`,
                        amount: quantity.toString() as any as Money,
                        allocationItemId: item.id,
                        typeId: AllocationTransactionType.FUND,
                    };

                    const [newTransactionRow] = <AllocationTransaction[]>await db(tables.AllocationTransactions)
                        .insert(newTransactionProps)
                        .returning("*")
                        ;

                    const transaction = AllocationTransactionEntity.fromRow(newTransactionRow);
                    transactions.push(transaction);
                }
            }, trx);

            const ret: AllocationLedger = {
                alloc,
                items,
                transactions,
            };

            if (newTransaction) {
                await trx.commit();
            }
            return ret;
        }
        catch (err) {
            await trx.rollback();
            throw err;
        }
    }
}
