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

        table.boolean("system").notNullable();
        table.string("desc").nullable();

        table.jsonb("meta").nullable();
    });

    // Add Mutation
    await knex.schema.createTable(tables.Mutations, table => {
        table.uuid("setId").notNullable();
        table.foreign("setId").references(`${ref(tables.MutationSets)}.id`);

        table.uuid("parentId1").nullable();
        table.foreign("parentId1").references(`${ref(tables.BotInstances)}.id`);

        table.uuid("parentId2").nullable();
        table.foreign("parentId2").references(`${ref(tables.BotInstances)}.id`);

        table.uuid("childId").notNullable();
        table.foreign("childId").references(`${ref(tables.BotInstances)}.id`);

        table.string("raw").notNullable();
        table.string("chromo").notNullable();
        table.string("gene").notNullable();
        table.string("value").notNullable();
        table.boolean("toggle").notNullable().defaultTo(false);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable(tables.Mutations);
    await knex.schema.dropTable(tables.MutationSets);
}
