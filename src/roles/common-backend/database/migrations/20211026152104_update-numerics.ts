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
    [tables.Prices, "stop"],
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
    knex.schema.alterTable(tables.Orders, table => {
        createBigNumber(knex, table, "capital");
    });

    // Drop unused raw values from prices
    knex.schema.alterTable(tables.Prices, table => {
        table.dropColumn("openRaw");
        table.dropColumn("close");
        table.dropColumn("lowRaw");
        table.dropColumn("highRaw");
    });
}


export async function down(knex: Knex): Promise<void> {
    for (const nu of numericUpdates) {
        const [table, col] = nu;
        revertNumeric(knex, table, col);
    }

    knex.schema.alterTable(tables.Prices, table => {
        table.string("openRaw");
        table.string("close");
        table.string("lowRaw");
        table.string("highRaw");
    });
}

function updateNumeric(knex: Knex, tableName: string, colName: string) {
    knex.schema.alterTable(tableName, table => {
        createBigNumber(knex, table, colName).alter();
    });
}

function revertNumeric(knex: Knex, tableName: string, colName: string) {
    knex.schema.alterTable(tableName, table => {
        createMonetaryColumnLegacy(knex, table, colName).alter();
    });
}
