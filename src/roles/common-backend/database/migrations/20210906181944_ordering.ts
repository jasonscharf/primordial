import { Knex } from "knex";
import { BotType } from "../../../common/models/bots/BotType";
import { OrderType } from "../../../common/models/markets/Order";
import { tables } from "../../constants";


// Add soft-delete flag
const tablesToAddDeleteFlagTo = [
    tables.BotDefinitions,
    tables.BotInstances,
    tables.BotRuns,
    tables.Orders,
    tables.AllocationTransactions,
    tables.AllocationItems,
    tables.Allocations,
];

export async function up(knex: Knex): Promise<void> {
    await addOrderTypes(knex);
    await addOrderFields(knex);
    await addDurationsToEvents(knex);
    await addBotTypes(knex);
    await addSoftDeleteFlags(knex);
    await addFieldsToBotInstance(knex);
    await addFieldsToBotRun(knex);
}

export async function down(knex: Knex): Promise<void> {
    await removeFieldsFromBotInstance(knex);
    await removeOrderFields(knex);
    await removeOrderTypes(knex);
    await removeDurationsFromEvents(knex);
    await removeBotTypes(knex);
    await removeSoftDeleteFlags(knex);
    await removeFieldsFromBotRun(knex);
}

async function addOrderTypes(knex: Knex) {
    await knex.schema.createTable(tables.OrderTypes, table => {
        table.string("id")
            .primary()
            .notNullable()
            .unique()
            ;

        table.string("displayName").notNullable();
    });

    // OrderType
    const orderTypes = [
        { id: OrderType.LIMIT_BUY, displayName: "Limit Sell", },
        { id: OrderType.LIMIT_SELL, displayName: "Limit Buy", },
        { id: OrderType.MARKET_BUY, displayName: "Market Buy", },
        { id: OrderType.MARKET_SELL, displayName: "Market Sell", },
    ];

    for (const ot of orderTypes) {
        await knex(tables.OrderTypes).insert(ot);
    }

}

async function addOrderFields(knex: Knex) {
    await knex.schema.alterTable(tables.Orders, table => {
        // NOTE: This migration was authored before there was any legit orders
        table.string("typeId").notNullable().defaultTo(OrderType.LIMIT_BUY);

        table.foreign("typeId").references(`${tables.OrderTypes}.id`);

        table.timestamp("opened").nullable();
        table.timestamp("closed").nullable();
    });
}

async function addDurationsToEvents(knex: Knex) {
    await knex.schema.alterTable(tables.Events, table => {
        table.timestamp("from").nullable();
        table.timestamp("to").notNullable();
    });
}

async function addSoftDeleteFlags(knex: Knex): Promise<void> {
    for (const tableName of tablesToAddDeleteFlagTo) {
        await knex.schema.alterTable(tableName, table => {
            table.boolean("deleted").notNullable().defaultTo(false);
        });
    }
}

async function addBotTypes(knex: Knex) {
    await knex.schema.createTable(tables.BotTypes, table => {
        table.string("id")
            .primary()
            .notNullable()
            .unique()
            ;

        table.string("displayName").notNullable();
    });

    // BotType
    const botTypes = [
        { id: BotType.SEED, displayName: "Seed", },
        { id: BotType.DESCENDANT, displayName: "Descendant", },
        { id: BotType.PAPER_CLONE, displayName: "Paper Clone", },
    ];

    for (const bt of botTypes) {
        await knex(tables.BotTypes).insert(bt);
    }
}

async function addFieldsToBotInstance(knex: Knex) {
    await knex.schema.alterTable(tables.BotInstances, table => {
        table.string("typeId").notNullable().defaultTo(BotType.SEED);
        table.foreign("typeId").references(`${tables.BotTypes}.id`);

        table.integer("gen").notNullable().defaultTo(0);
    });
}

async function addFieldsToBotRun(knex: Knex) {
    await knex.schema.alterTable(tables.BotRuns, table => {
        table.timestamp("from").notNullable().defaultTo(new Date().toISOString());
        table.timestamp("to").notNullable().defaultTo(new Date().toISOString());
    });

    await knex(tables.BotRuns)
        .update("from", knex.ref("created"))
        .update("to", knex.ref("updated"))
        ;
}

async function removeFieldsFromBotRun(knex: Knex) {
    await knex.schema.alterTable(tables.BotRuns, table => {
        table.dropColumn("from");
        table.dropColumn("to");
    });
}

async function removeFieldsFromBotInstance(knex: Knex) {
    await knex.schema.alterTable(tables.BotInstances, table => {
        table.dropColumn("typeId");
        table.dropColumn("gen");
    });
}

async function removeSoftDeleteFlags(knex: Knex) {
    for (const tableName of tablesToAddDeleteFlagTo) {
        await knex.schema.alterTable(tableName, table => {
            table.dropColumn("deleted");
        });
    }
}

async function removeDurationsFromEvents(knex: Knex) {
    await knex.schema.alterTable(tables.Events, table => {
        table.dropColumn("from");
        table.dropColumn("to");
    });
}

async function removeOrderFields(knex: Knex) {
    await knex.schema.alterTable(tables.Orders, table => {
        table.dropColumn("typeId");
        table.dropColumn("opened");
        table.dropColumn("closed");
    });
}

async function removeOrderTypes(knex: Knex) {
    await knex.schema.dropTableIfExists(tables.OrderTypes);
}

async function removeBotTypes(knex: Knex) {
    await knex.schema.dropTableIfExists(tables.BotTypes);
}
