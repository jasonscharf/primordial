import { Knex } from "knex";
import { createCommonEntityFields, ref } from "../utils";
import { tables } from "../../constants";


export async function up(knex: Knex): Promise<void> {

    // Add MutationSet
    await knex.schema.createTable(tables.MutationSets, table => {
        createCommonEntityFields(knex, table);

        table.uuid("ownerId").notNullable();
        table.foreign("ownerId").references(`${ref(tables.Users)}.id`);

        table.uuid("workspaceId").notNullable();
        table.foreign("workspaceId").references(`${ref(tables.Workspaces)}.id`);

        table.uuid("strategyId").notNullable();
        table.foreign("strategyId").references(`${ref(tables.Strategies)}.id`);

        table.uuid("psid").nullable();
        table.foreign("psid").references(`${ref(tables.MutationSets)}.id`);

        table.boolean("system").notNullable();
        table.string("desc").nullable();

        table.jsonb("meta").nullable();

        // Not mapped to an enum table until mutation type values decided
        table.string("type").notNullable();
    });

    // Add Mutation
    await knex.schema.createTable(tables.Mutations, table => {
        table.uuid("id")
            .primary()
            .defaultTo(knex.raw("uuid_generate_v4()"));

        // ID of parent MutationSet
        table.uuid("msid").nullable();
        table.foreign("msid").references(`${ref(tables.MutationSets)}.id`);

        table.uuid("pid1").nullable();
        table.foreign("pid1").references(`${ref(tables.BotInstances)}.id`);

        table.uuid("pid2").nullable();
        table.foreign("pid2").references(`${ref(tables.BotInstances)}.id`);

        table.uuid("chid").notNullable();
        table.foreign("chid").references(`${ref(tables.BotInstances)}.id`);

        table.string("raw").notNullable();
        table.string("chromo").notNullable();
        table.string("gene").notNullable();
        table.string("value").notNullable();
        table.boolean("toggle").notNullable().defaultTo(false);
    });

    // Link instances to MutationSet
    await knex.schema.alterTable(tables.BotInstances, table => {
        table.uuid("msid").nullable();
        table.foreign("msid").references(`${ref(tables.MutationSets)}`);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable(tables.BotInstances, table => {
        table.dropColumn("msid");
    });
    await knex.schema.dropTable(tables.Mutations);
    await knex.schema.dropTable(tables.MutationSets);
}
