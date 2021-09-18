import { Knex } from "knex";
import { tables } from "../../constants";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable(tables.BotDefinitions, table => {
        if (knex.schema.hasColumn(tables.BotDefinitions, "normalizedGenome")) {
            table.dropColumn("normalizedGenome");
        }
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable(tables.BotDefinitions, table => {
        table.string("normalizedGenome").nullable();
    });
}

