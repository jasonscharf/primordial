import { Knex } from "knex";
import { createBigNumber, createMonetaryColumnLegacy } from "../utils";
import { tables } from "../../constants";


// Table/column pairs to remove decimal constraints
const numericUpdates = [
    [tables.AllocationItems, "amount"],
    [tables.AllocationItems, "maxWagerPct"],
    [tables.Allocations, "maxDrawdownPct"],
    [tables.AllocationTransactions, "amount"],
    [tables.Fees, "amount"],
    [tables.Fees, "rate"],
    [tables.OrderFills, "price"],
    [tables.OrderFills, "quantity"],
    [tables.Orders, "fees"],
    [tables.Orders, "gross"],
    [tables.Orders, "limit"],
    [tables.Orders, "price"],
    [tables.Orders, "quantity"],
    [tables.Orders, "strike"],
    [tables.Orders, "stop"],
    [tables.Prices, "open"],
    [tables.Prices, "high"],
    [tables.Prices, "low"],
    [tables.Prices, "close"],
    [tables.Prices, "volume"],
];

export async function up(knex: Knex): Promise<void> {

    for (const nu of numericUpdates) {
        const [table, col] = nu;

        updateNumeric(knex, table, col);
    }

    // Add "capital" to Orders for easy tracking of input capital
    await knex.schema.alterTable(tables.Orders, table => {
        createBigNumber(knex, table, "capital");
    });

    // Up to this point in time:
    // - No real orders have been issued; all tests so far
    // - Most or all test orders have been using 1000 USDT
    const testCapitalValue = 1000;

    await knex.table(tables.Orders)
        .update({ capital: testCapitalValue })
        ;

    /*
await knex.schema.alterTable(tables.Orders, table => {
    table.decimal("capital").notNullable().alter();
});*/

    // Drop unused raw values from prices
    await knex.schema.alterTable(tables.Prices, table => {
        table.dropColumn("openRaw");
        table.dropColumn("closeRaw");
        table.dropColumn("lowRaw");
        table.dropColumn("highRaw");
    });
}


export async function down(knex: Knex): Promise<void> {

    // Not bothering to revert widening of numeric types as there are no side effects
    // to widening the numberic type (and if there were, they would just be overflow tests against PG...)

    /*
    for (const nu of numericUpdates) {
        const [table, col] = nu;
        await revertNumeric(knex, table, col);
    }*/

    await knex.schema.alterTable(tables.Orders, table => {
        table.dropColumn("capital");
    });

    await knex.schema.alterTable(tables.Prices, table => {
        table.string("openRaw");
        table.string("closeRaw");
        table.string("lowRaw");
        table.string("highRaw");
    });
}

async function updateNumeric(knex: Knex, tableName: string, colName: string) {
    // Note: Knex may have an issue with widening/narrowing numeric types here so we use raw
    await knex.raw(`ALTER TABLE "${tableName}" ALTER COLUMN "${colName}" TYPE DECIMAL USING ("${colName}"::decimal)`);
}

/*
async function revertNumeric(knex: Knex, tableName: string, colName: string) {

    await knex.schema.alterTable(tableName, table => {
        createMonetaryColumnLegacy(knex, table, colName).alter();
    });
}
*/
