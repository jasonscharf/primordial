import "intern";
import Knex from "knex";
import { Money } from "../../common/numbers";
import { Price } from "../../common/models/system/Price";
import { TestDataCtx, getTestData } from "../utils/test-data";
import { TradeSymbol, TradeSymbolType } from "../../common/models/markets/TradeSymbol";
import { User } from "../../common/models";
import { assert, describe, before, env, it } from "../includes";
import { db, us, sym } from "../../common-backend/includes";
import { sleep } from "../../common/utils";
import { assertRejects } from "../utils/async";


describe("database", () => {
    let ctx: TestDataCtx = null;

    before(async () => {
        ctx = await getTestData();
    });

    it("can connect", async () => {
        const result = await db.raw("SELECT 1");
        assert.exists(result);
        const { rows } = result;
        assert.exists(rows);
        assert.lengthOf(rows, 1);
    });

    it("round-trips JavaScript Date objects correctly", async () => {
        const user: Partial<User> = {
            displayName: "Lil' Bear",
            nameFirst: "Little",
            nameLast: "Bear",
        };

        const newUser = await us.insertUser(user);
        const now = new Date();

        assert.exists(newUser);
        const { created } = newUser;

        // Basically just a sanity check to ensure we're not off by a server timezone offset
        assert.equal(created.getHours(), now.getHours());
        assert.equal(created.getMinutes(), now.getMinutes());
        assert.equal(created.getSeconds(), now.getSeconds());
    });

    it("automatically updates the 'updated' timestamp on a record", async () => {
        const user: Partial<User> = {
            displayName: "Moosington",
            nameFirst: "Moosington",
            nameLast: "Borkwell",
        };

        const newUser = await us.insertUser(user);
        assert.exists(newUser);

        const createdAt = newUser.created;
        const updatedAtCreation = newUser.updated;

        assert.equal(createdAt.getTime(), updatedAtCreation.getTime());

        const updatedProps: Partial<User> = {
            id: newUser.id,
            displayName: "Moosington Borkwell, Esq.",
        };

        await sleep(100);

        const updatedUser = await us.updateUser(updatedProps);
        const { updated } = updatedUser;

        assert.ok(updated.getTime() > updatedAtCreation.getTime());
    });



    it("throws on monetary values into the single-digit trillions", async () => {
        const precisePriceStr = "1999999999.000000000001";
        const dummyPriceProps: Partial<Price> = {
            exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
            baseSymbolId: ctx.testSymbol1.id,
            quoteSymbolId: ctx.testSymbol1.id,
            resId: "1m",
            ts: new Date(),
            open: Money(precisePriceStr),
            low: Money(precisePriceStr),
            high: Money(precisePriceStr),
            close: Money(precisePriceStr),
            volume: Money("1"),
        };

        await assertRejects(() => sym.addSymbolPrice(dummyPriceProps));
    });

    it("correctly represents non-ASCII symbols", async () => {
        const symbolProps: Partial<TradeSymbol> = {
            typeId: TradeSymbolType.CRYPTO,
            id: "MOOSECOIN CASH",
            sign: "ᔉ",
            displayUnits: 8,
        };

        const newCurrency = await sym.addSymbol(symbolProps);
        assert.equal(newCurrency.sign, symbolProps.sign);
    });
});
