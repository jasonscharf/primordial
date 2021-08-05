import { Knex } from "knex";
import { TradeSymbolType } from "../../../common/models/markets/TradeSymbol";
import { PlanMode } from "../../../common/models/system/Plan";
import { addUpdateTimestampTrigger } from "../../../common/utils";
import { createCommonEntityFields as createMutableEntityFields, createMonetaryColumn, enableCompression as enableTimescaleDbCompression } from "../utils";
import env from "../../env";
import { db, log, tables } from "../../includes";
import { Exchange } from "../../../common/models/markets/Exchange";
import { OrderState } from "../../../common/models/markets/Order";
import { TimeResolution } from "../../../common/models/markets/TimeResolution";
import { transpile } from "typescript";


export async function up(knex: Knex): Promise<void> {
    await createCoreSchema(knex);
    await addUpdateTimestampTriggersToMutables(knex);
    await createInitialData(knex);

    // TimescaleDB hypertables for asset prices and system events
    await createHypertable(knex, tables.Events);
    await createHypertable(knex, tables.Prices);

    // Note: Events are compressed, but prices are not, as they require back-filling, which comes
    // with some practical overhead in TimescaleDB and uncompressing chunks in order to update them.
    await enableTimescaleDbCompression(knex, tables.Events, "name");
}

export async function createCoreSchema(knex: Knex) {

    // TimeResolution
    await knex.schema.createTable(tables.TimeResolutions, table => {
        table.string("id")
            .primary()
            .notNullable()
            .unique()
            ;

        table.string("displayName").notNullable();
    });


    // EventStreamEvent
    await knex.schema.createTable(tables.Events, table => {
        table.timestamp("ts")
            .primary()
            .unique();

        table.string("name").notNullable();
        table.jsonb("eventJson").notNullable();
    });

    // TradeSymbolType
    await knex.schema.createTable(tables.TradeSymbolTypes, table => {
        table.string("id")
            .primary()
            .notNullable()
            .unique()
            ;

        table.string("displayName").notNullable();
    });

    // TradeSymbol
    await knex.schema.createTable(tables.TradeSymbols, table => {
        table.string("id")
            .primary()
            .notNullable()
            .unique();

        table.string("typeId").notNullable();
        table.foreign("typeId").references(`${tables.TradeSymbolTypes}.id`);

        table.string("sign").notNullable().unique();
        table.string("displayName").nullable();
        table.integer("displayUnits").notNullable();
    });

    // Exchange
    await knex.schema.createTable(tables.Exchanges, table => {
        table.string("id")
            .primary()
            .notNullable()
            .unique();

        table.string("displayName").nullable();
    });

    // PlanMode
    await knex.schema.createTable(tables.PlanModes, table => {
        table.string("id")
            .primary()
            .notNullable()
            .unique();

        table.string("displayName").notNullable();
    });

    // Price
    await knex.schema.createTable(tables.Prices, table => {
        table.timestamp("ts")
            .primary()
            .notNullable();

        table.string("baseSymbolId").notNullable();
        table.foreign("baseSymbolId").references(`${tables.TradeSymbols}.id`);

        table.string("quoteSymbolId").notNullable();
        table.foreign("quoteSymbolId").references(`${tables.TradeSymbols}.id`);

        table.string("exchangeId").notNullable();
        table.foreign("exchangeId").references(`${tables.Exchanges}.id`);

        table.string("resId").notNullable();
        table.foreign("resId").references(`${tables.TimeResolutions}.id`);

        createMonetaryColumn(knex, table, "open");
        createMonetaryColumn(knex, table, "high");
        createMonetaryColumn(knex, table, "low");
        createMonetaryColumn(knex, table, "close");

        // These are for long-term QA on numeric handling :)
        table.string("openRaw");
        table.string("highRaw");
        table.string("lowRaw");
        table.string("closeRaw");

        // 8 digits on the left should be enough (just like 640K of RAM)
        table.decimal("volume", 10, 2).notNullable();
    });

    // OrderState
    await knex.schema.createTable(tables.OrderStates, table => {
        table.string("id")
            .primary()
            .notNullable()
            .unique();

        table.string("displayName").notNullable();
    });

    // User
    await knex.schema.createTable(tables.Users, table => {
        createMutableEntityFields(knex, table);

        // Derived from a user's identity (of which there may be multiple)
        // Partially here for convenience as well.
        table.string("nameFirst").notNullable();
        table.string("nameLast").notNullable();
        table.string("nameMiddle").nullable();
    });

    // UserIdentity
    await knex.schema.createTable(tables.UserIdentities, table => {
        createMutableEntityFields(knex, table);

        table.uuid("userId");
        table.foreign("userId").references(`${tables.Users}.id`);

        // UserIdentityProvider
        table.string("provider").notNullable();
        table.string("pid").notNullable().unique();
        table.string("nameFirst");
        table.string("nameMiddle");
        table.string("nameLast");
    });

    // UserInvite
    await knex.schema.createTable(tables.UserInvites, table => {
        createMutableEntityFields(knex, table);

        table.uuid("inviterUserId");
        table.foreign("inviterUserId").references(`${tables.Users}.id`);

        table.uuid("redeemerUserId").nullable();
        table.foreign("redeemerUserId").references(`${tables.Users}.id`);

        table.string("email");

        table.string("code").unique();
        table.boolean("redeemed").defaultTo(false);
    });

    // Workspace
    await knex.schema.createTable(tables.Workspaces, table => {
        createMutableEntityFields(knex, table);

        table.uuid("ownerId").notNullable();
        table.foreign("ownerId").references(`${tables.Users}.id`);
        table.string("description").nullable();
    });

    // BotDefinition
    await knex.schema.createTable(tables.BotDefinitions, table => {
        createMutableEntityFields(knex, table);

        table.uuid("workspaceId").notNullable();
        table.foreign("workspaceId").references(`${tables.Workspaces}.id`);
        table.string("genome").notNullable();
        table.string("description").nullable();
    });

    // BotInstance
    await knex.schema.createTable(tables.BotInstances, table => {
        createMutableEntityFields(knex, table);

        table.uuid("definitionId").notNullable();
        table.foreign("definitionId").references(`${tables.BotDefinitions}.id`);

        table.string("currentGenome").notNullable();
        table.jsonb("stateJson").nullable();
    });

    // BotRun
    await knex.schema.createTable(tables.BotRuns, table => {
        createMutableEntityFields(knex, table);

        table.uuid("instanceId").notNullable();
        table.foreign("instanceId").references(`${tables.BotInstances}.id`);
    });

    // Order
    await knex.schema.createTable(tables.Orders, table => {
        createMutableEntityFields(knex, table);

        table.uuid("botRunId").notNullable();
        table.foreign("botRunId").references(`${tables.BotRuns}.id`);

        table.string("baseSymbolId").notNullable();
        table.foreign("baseSymbolId").references(`${tables.TradeSymbols}.id`);

        table.string("quoteSymbolId").notNullable();
        table.foreign("quoteSymbolId").references(`${tables.TradeSymbols}.id`);

        table.string("exchangeId").notNullable();
        table.foreign("exchangeId").references(`${tables.Exchanges}.id`);

        table.uuid("stopLossOrderId").nullable();
        table.foreign("stopLossOrderId").references(`${tables.Orders}.id`);

        table.uuid("relatedOrderId").nullable();
        table.foreign("relatedOrderId").references(`${tables.Orders}.id`);

        table.string("stateId").notNullable();
        table.foreign("stateId").references(`${tables.OrderStates}.id`);

        table.string("extOrderId").notNullable();

        createMonetaryColumn(knex, table, "quantity");
        createMonetaryColumn(knex, table, "price");
        createMonetaryColumn(knex, table, "gross");
        createMonetaryColumn(knex, table, "fees");
        createMonetaryColumn(knex, table, "strike");
        createMonetaryColumn(knex, table, "limit");
        createMonetaryColumn(knex, table, "stop");
    });

    // Fill
    await knex.schema.createTable(tables.OrderFills, table => {
        table.uuid("id")
            .primary()
            .defaultTo(knex.raw("uuid_generate_v4()"));

        table.uuid("orderId").notNullable();
        table.foreign("orderId").references(`${tables.Orders}.id`);

        createMonetaryColumn(knex, table, "quantity");
        createMonetaryColumn(knex, table, "price");
    });


    // Plan
    await knex.schema.createTable(tables.Plans, table => {
        createMutableEntityFields(knex, table);

        table.uuid("ownerId").notNullable();
        table.foreign("ownerId").references(`${tables.Users}.id`);

        table.uuid("workspaceId");
        table.foreign("workspaceId").references(`${tables.Workspaces}.id`);

        table.string("description").nullable();

        // PlanMode
        table.string("modeId").notNullable();
        table.foreign("modeId").references(`${tables.PlanModes}.id`);
    });
}

export async function createHypertable(knex: Knex, tableName: string) {
    await knex.raw(`SELECT create_hypertable('${tableName}', 'ts', if_not_exists => TRUE);`);
}

export async function createInitialData(knex: Knex) {

    // TimeResolution
    for (const key of Object.keys(TimeResolution)) {
        const res = TimeResolution[key];
        await knex(tables.TimeResolutions).insert({
            id: res,
            displayName: res,
        });
    }

    // Exchange
    const exchanges: Partial<Exchange>[] = [
        { id: "binance", displayName: "Binance" },
    ];

    for (const ex of exchanges) {
        await knex(tables.Exchanges).insert(ex);
    }

    // OrderState
    const orderStates = [
        { id: OrderState.OPEN, displayName: "Open", },
        { id: OrderState.FILLING, displayName: "Filling", },
        { id: OrderState.CLOSED, displayName: "Closed", },
        { id: OrderState.CANCELLED, displayName: "Cancelled", },
        { id: OrderState.ERROR, displayName: "Error", },
    ];

    for (const os of orderStates) {
        await knex(tables.OrderStates).insert(os);
    }

    // TradeSymbolType
    const symbolTypes = [
        { id: TradeSymbolType.CRYPTO, displayName: "Cryptocurrency", },
        { id: TradeSymbolType.EQUITY, displayName: "Equity", },
        { id: TradeSymbolType.FIAT, displayName: "Fiat", },
    ];

    for (const st of symbolTypes) {
        await knex(tables.TradeSymbolTypes).insert(st);
    }

    // PlanMode
    const planModes = [
        { id: PlanMode.BACK_TEST, displayName: "Back testing", },
        { id: PlanMode.FORWARD_TEST, displayName: "Forward testing", },
        { id: PlanMode.LIVE, displayName: "Live" },
        { id: PlanMode.LIVE_TEST, displayName: "Live testing", },
        { id: PlanMode.PAUSED, displayName: "Paused" },
    ];

    for (const pm of planModes) {
        await knex(tables.PlanModes).insert(pm);
    }
}

async function addUpdateTimestampTriggersToMutables(knex: Knex) {
    await addUpdateTimestampTrigger(knex, tables.Exchanges);
    await addUpdateTimestampTrigger(knex, tables.Plans);
    await addUpdateTimestampTrigger(knex, tables.BotRuns);
    await addUpdateTimestampTrigger(knex, tables.BotInstances);
    await addUpdateTimestampTrigger(knex, tables.BotDefinitions);
    await addUpdateTimestampTrigger(knex, tables.Orders);
    await addUpdateTimestampTrigger(knex, tables.UserIdentities);
    await addUpdateTimestampTrigger(knex, tables.UserInvites);
    await addUpdateTimestampTrigger(knex, tables.Users);
    await addUpdateTimestampTrigger(knex, tables.Workspaces);

    // These don't bear UUID primary ID keys or created/updated timestamps:
    // Events, Prices, PlanModes, TradeSymbols, TradeSymbolTypes
}    

export async function down(knex: Knex): Promise<void> {

    // Drop in the correct order in case data exists
    await knex.schema.dropTableIfExists(tables.OrderFills);
    await knex.schema.dropTableIfExists(tables.Orders);
    await knex.schema.dropTableIfExists(tables.OrderStates);
    await knex.schema.dropTableIfExists(tables.Events);
    await knex.schema.dropTableIfExists(tables.Plans);
    await knex.schema.dropTableIfExists(tables.PlanModes);
    await knex.schema.dropTableIfExists(tables.Prices);
    await knex.schema.dropTableIfExists(tables.Exchanges);
    await knex.schema.dropTableIfExists(tables.BotRuns);
    await knex.schema.dropTableIfExists(tables.BotInstances);
    await knex.schema.dropTableIfExists(tables.BotDefinitions);
    await knex.schema.dropTableIfExists(tables.Workspaces);
    await knex.schema.dropTableIfExists(tables.UserIdentities);
    await knex.schema.dropTableIfExists(tables.UserInvites);
    await knex.schema.dropTableIfExists(tables.Users);
    await knex.schema.dropTableIfExists(tables.TradeSymbols);
    await knex.schema.dropTableIfExists(tables.TradeSymbolTypes);
    await knex.schema.dropTableIfExists(tables.TimeResolutions);
}
