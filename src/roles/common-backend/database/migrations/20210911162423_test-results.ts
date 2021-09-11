import { Knex } from "knex";
import { tables } from "../../constants";
import { createCommonEntityFields } from "../utils";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable(tables.Results, table => {
        createCommonEntityFields(knex, table);

        table.uuid("botRunId").notNullable();
        table.foreign("botRunId").references(`${tables.BotRuns}.id`);

        table.string("exchangeId").notNullable();
        table.foreign("exchangeId").references(`${tables.Exchanges}.id`);

        table.string("baseSymbolId").notNullable();
        table.foreign("baseSymbolId").references(`${tables.TradeSymbols}.id`);

        table.string("quoteSymbolId").notNullable();
        table.foreign("quoteSymbolId").references(`${tables.TradeSymbols}.id`);

        table.timestamp("from").notNullable();
        table.timestamp("to").notNullable();

        table.jsonb("results").notNullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable(tables.Results);
}

