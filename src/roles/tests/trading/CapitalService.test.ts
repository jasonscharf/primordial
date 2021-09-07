import { AllocationTransaction } from "../../common/models/capital/AllocationTransaction";
import { AllocationTransactionEntity } from "../../common/entities/AllocationTransaction";
import { AllocationTransactionType } from "../../common/models/capital/AllocationTransactionType";
import { CapitalService } from "../../common-backend/services/CapitalService";
import { Money, randomString } from "../../common/utils";
import { Order, OrderState } from "../../common/models/markets/Order";
import { Strategy } from "../../common/models/system/Strategy";
import { TestDataCtx, getTestData, addNewBotDefAndInstance, makeTestOrder, clearTestData, TEST_DEFAULT_BUDGET } from "../utils/test-data";
import { User } from "../../common/models";
import { Workspace } from "../../common/models/system/Workspace";
import { assert, describe, before, env, it } from "../includes";
import { assertRejects } from "../utils/async";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { query } from "../../common-backend/database/utils";
import { orders, strats, sym, users } from "../../common-backend/includes";
import { DEFAULT_ALLOCATION_DRAWDOWN_MAX_PCT, tables } from "../../common-backend/constants";


describe(CapitalService.name, () => {
    let ctx: TestDataCtx = null;
    let cap: CapitalService = new CapitalService();
    let defaultWorkspace: Workspace = null;
    let defaultStrategy: Strategy = null;
    let systemUser: User = null;

    before(async () => {
        ctx = await getTestData();
        systemUser = await users.getSystemUser();
        defaultWorkspace = await strats.getDefaultWorkspaceForUser(systemUser.id, systemUser.id);
        defaultStrategy = await strats.getOrCreateDefaultStrategy(defaultWorkspace.id, systemUser.id);
    });

    beforeEach(async () => {
        cap = new CapitalService();
    });

    describe(cap.createAllocationForBot.name, () => {
        it("creates a new allocation record", async () => {
            const allocStr = "1000 TUSD";
            const { def, instance } = await addNewBotDefAndInstance();
            const { alloc, items, transactions } = await cap.createAllocationForBot(defaultStrategy.id, allocStr);
            assert.equal(alloc.strategyId, defaultStrategy.id);
            assert.equal(alloc.maxDrawdownPct, DEFAULT_ALLOCATION_DRAWDOWN_MAX_PCT);
            assert.equal(alloc.live, false);

            assert.lengthOf(items, 1);
            const [item] = items;
            assert.equal(item.allocationId, alloc.id);
            assert.equal(item.amount.toString(), "1000");
            assert.equal(item.symbolId, "TUSD");

            assert.lengthOf(transactions, 1);
            const [transaction] = transactions;
            assert.equal(transaction.allocationItemId, item.id);
            assert.equal(transaction.amount.toString(), "1000");
            assert.equal(transaction.typeId, AllocationTransactionType.FUND);

            // Verify stored in DB (trx completed)
            const ledger = await cap.getAllocationLedger(alloc.id);
            assert.equal(ledger.alloc.id, alloc.id);

            // ...
        });

        // TEST: Max drawdown... need to pass in allocation options

    });

    describe(cap.getItemFromAllocationForBot.name, () => {
        it("does some stuff", async () => {
        });
    });

    describe(cap.getBalanceForSymbol.name, () => {

    });

    describe(cap.transact.name, () => {
        async function addFakeTransaction() {
            const { instance, run } = await addNewBotDefAndInstance(TEST_DEFAULT_BUDGET, true);
            const order = makeTestOrder({ botRunId: run.id });

            let delegateExecuted = false;
            const transaction = await cap.transact(instance.id, "TUSD", order, async (item, trx) => {
                delegateExecuted = true;

                const savedOrder = await orders.addOrderToDatabase(order);
                const fakeTransaction: Partial<AllocationTransaction> = {
                    allocationItemId: item.id,
                    amount: Money("1"),
                    orderId: savedOrder.id,
                    typeId: AllocationTransactionType.DEBIT,
                };

                return fakeTransaction;
            });

            return transaction;
        }

        it("executes the delegate and saves the transaction", async () => {
            await clearTestData();
            const { instance, run } = await addNewBotDefAndInstance(TEST_DEFAULT_BUDGET, true);
            const order = makeTestOrder({ botRunId: run.id });

            let delegateExecuted = false;
            const transaction = await cap.transact(instance.id, "TUSD", order, async (item, trx) => {
                delegateExecuted = true;
                const fakeTransaction: Partial<AllocationTransaction> = {
                    allocationItemId: item.id,
                    amount: Money("1"),
                    orderId: order.id,
                    typeId: AllocationTransactionType.DEBIT,
                };
                return fakeTransaction;
            });
        });

        it("throw if the delegate throws", async () => {
            const { instance, run } = await addNewBotDefAndInstance(TEST_DEFAULT_BUDGET, true);
            const order = makeTestOrder({ botRunId: run.id });

            await assertRejects(() => cap.transact(instance.id, "TUSD", order, async (item, trx) => {
                throw new Error(`Something went wrong in the transaction`);
            }));
        });

        it("saves a valid transaction", async () => {
            await clearTestData();
            const t = await addFakeTransaction();

            const existing = await query("test.saves-a-valid-transaction", async trx => {
                const [row] = await trx(tables.AllocationTransactions)
                    .where({ id: t.id });

                return AllocationTransactionEntity.fromRow(row);
            });

            assert.exists(existing);
            assert.equal(t.amount.toString(), existing.amount.toString());
            assert.equal(t.typeId.toString(), existing.typeId.toString());
            assert.equal(t.allocationItemId.toString(), existing.allocationItemId);
        });
    });

    describe(cap.getAllocationLedger.name, () => {
        it("returns transactions sorted ascending by date", async () => {
            // TEST
        });
    });

    describe(cap.parseAssetAmounts.name, () => {
        it("throws on invalid asset amounts", async () => {
            const badValues = [
                " 1000  US D",
                "  1000.1234567890 US D",
                "1000. 1234567890 USD",
                "1000,1234567890 USD",
                "1 2 3 A B C",
            ];

            const numBadValues = badValues.length;
            let numThrows = 0;
            for (const raw of badValues) {
                try {
                    await cap.parseAssetAmounts(raw);
                }
                catch (err) {
                    ++numThrows;
                }
            }

            assert.equal(numThrows, numBadValues);
        });

        it("throws on an unknown symbol", async () => {
            const unknownSymbol = randomString(32);
            await assertRejects(() => cap.parseAssetAmounts(`500 ${unknownSymbol}`));
        });

        it("throws on an empty string", async () => {
            const emptyAmountStr = "";
            await assertRejects(() => cap.parseAssetAmounts(emptyAmountStr));
            const emptyAmountStrWithSpace = " ";
            await assertRejects(() => cap.parseAssetAmounts(emptyAmountStrWithSpace));
        });

        it("throws with no symbol", async () => {
            const noSymbolStr = "100";
            await assertRejects(() => cap.parseAssetAmounts(noSymbolStr));
        });

        it("throws with just a symbol", async () => {
            const symbolOnlyStr = "BTC";
            await assertRejects(() => cap.parseAssetAmounts(symbolOnlyStr));
        });

        it("throws on an empty symbol", async () => {
            const emptyAmountStr = "";
            await assertRejects(() => cap.parseAssetAmounts(emptyAmountStr));
        });

        it("supports an amount with 12 decimal points", async () => {
            const rawValueStr = "0.123456789012";
            const amountStr = `${rawValueStr} BTC`;
            const results = await cap.parseAssetAmounts(amountStr);
            assert.lengthOf(results, 1);
            const [result] = results;
            assert.equal(result.quantity.toString(), rawValueStr);
            assert.equal(result.symbol.id, "BTC");
        });

        it("throws on an amount with 13 decimal points", async ctx => {
            ctx.skip(`Skipped because Big.js doesn't throw`);

            const rawValueStr = "0.123456789012 BTC";
            await assertRejects(() => cap.parseAssetAmounts(rawValueStr));
        });

        it("handles whitespace correctly", async () => {
            const rawValueStr = "  208420   BTC  ";
            const results = await cap.parseAssetAmounts(rawValueStr);
            assert.lengthOf(results, 1);
            const [result] = results;
            assert.equal(result.quantity.toString(), "208420");
            assert.equal(result.symbol.id, "BTC");
        });

        it("handles negative amounts", async () => {
            const rawValueStr = "-666";
            const amountStr = `${rawValueStr} BTC`;
            const results = await cap.parseAssetAmounts(amountStr);
            assert.lengthOf(results, 1);
            const [result] = results;
            assert.equal(result.quantity.toString(), rawValueStr);
            assert.equal(result.symbol.id, "BTC");
        });

        it("handles multiple amounts in multiple currencies", async () => {
            // TEST
        });
    });
});
