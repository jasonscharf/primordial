import { AllocationTransactionType } from "../../common/models/capital/AllocationTransactionType";
import { CapitalService, WidthdrawalArgs } from "../../common-backend/services/CapitalService";
import { Money, randomString } from "../../common/utils";
import { Strategy } from "../../common/models/system/Strategy";
import { TestDataCtx, getTestData, addNewBotDefAndInstance } from "../utils/test-data";
import { User } from "../../common/models";
import { Workspace } from "../../common/models/system/Workspace";
import { assert, describe, before, env, it } from "../includes";
import { assertRejects } from "../utils/async";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { bot } from "../../spooler/cli/commands";
import { strats, sym, users } from "../../common-backend/includes";
import { DEFAULT_ALLOCATION_DRAWDOWN_MAX_PCT } from "../../common-backend/constants";


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
        it("throws on negative initial amount", async => {
            // TEST
        });


        it("creates a new allocation record", async () => {
            const allocStr = "1000 USD";
            const { def, instance } = await addNewBotDefAndInstance();
            const { alloc, items, transactions } = await cap.createAllocationForBot(defaultStrategy.id, allocStr);
            assert.equal(alloc.strategyId, defaultStrategy.id);
            assert.equal(alloc.maxDrawdownPct, DEFAULT_ALLOCATION_DRAWDOWN_MAX_PCT);
            assert.equal(alloc.live, false);

            assert.lengthOf(items, 1);
            const [item] = items;
            assert.equal(item.allocationId, alloc.id);
            assert.equal(item.amount.toString(), "1000");
            assert.equal(item.symbolId, "USD");

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

    describe(cap.requestWithdrawalForBotOrder.name, () => {
        it("returns a transaction for a valid bot withdrawal", async () => {
            const amountRaw = "100";
            const bot = await addNewBotDefAndInstance();
            const args: WidthdrawalArgs = {
                botInstanceId: bot.instance.id,
                requestedAmount: Money(amountRaw),
            };
            const transaction = await cap.requestWithdrawalForBotOrder(args);
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
