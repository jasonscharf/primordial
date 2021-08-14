import { Knex } from "knex";
import { createCommonEntityFields } from "../utils";
import { tables } from "../../constants";


export async function up(knex: Knex): Promise<void> {

    // Market
    await knex.schema.createTable(tables.Markets, table => {
        createCommonEntityFields(knex, table);

        table.string("baseSymbolId").notNullable();
        table.foreign("baseSymbolId").references(`${tables.TradeSymbols}.id`);

        table.string("quoteSymbolId").notNullable();
        table.foreign("quoteSymbolId").references(`${tables.TradeSymbols}.id`);

        table.string("exchangeId").notNullable();
        table.foreign("exchangeId").references(`${tables.Exchanges}.id`);

        // CCXT definition
        table.jsonb("definition").notNullable();
    });

    // SpoolerTask
    await knex.schema.createTable(tables.SpoolerTasks, table => {
        createCommonEntityFields(knex, table);

        table.string("name").notNullable();
        table.timestamp("prevRun").nullable();
        table.timestamp("nextRun").nullable();
        table.integer("frequencySeconds").notNullable().defaultTo(0);
        table.string("lastError").nullable();
        table.boolean("isRunning").notNullable().defaultTo(false);
        table.integer("runCount").notNullable().defaultTo(0);

        table.jsonb("state").nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable(tables.Markets);
    await knex.schema.dropTable(tables.SpoolerTasks);
}
