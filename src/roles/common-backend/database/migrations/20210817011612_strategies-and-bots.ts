import knex, { Knex } from "knex";
import { BotMode } from "../../../common/models/system/Strategy";
import { RunState } from "../../../common/models/system/RunState";
import { TimeResolution } from "../../../common/models/markets/TimeResolution";
import { User } from "../../../common/models/user/User";
import { Workspace } from "../../../common/models/system/Workspace";
import { WorkspaceEntity } from "../../../common/entities/WorkspaceEntity";
import { constants, log, strats, users } from "../../includes";
import { createCommonEntityFields, createMonetaryColumnLegacy, query, ref } from "../utils";
import { DEFAULT_STRATEGY, tables } from "../../constants";
import env from "../../env";
import { create } from "domain";
import { AllocationTransactionType } from "../../../common/models/capital/AllocationTransactionType";


const DEFAULT_GENOME = "RSIL=20|RSIH=60";

export async function up(knex: Knex): Promise<void> {

    // Rename Plan -> Strategy
    await knex.schema.renameTable("plans", tables.Strategies);
    await knex.schema.renameTable("plan_modes", tables.Modes);

    // Schema changes //
    // Add fields to Strategy
    await knex.schema.alterTable(tables.Strategies, table => {
        table.string("name").notNullable();

        // Strategies must be uniquely named in workspaces
        table.unique(["workspaceId", "name"]);
    });


    // Add fields to BotDefinition
    await knex.schema.alterTable(tables.BotDefinitions, table => {
        table.string("name").notNullable();
        table.string("normalizedGenome").notNullable();
        table.string("symbols").notNullable().defaultTo("*");
    });


    // New entities //
    // Add ExchangeAccount
    await knex.schema.createTable(tables.ExchangeAccounts, table => {
        createCommonEntityFields(knex, table);

        table.string("exchangeId").notNullable();
        table.foreign("exchangeId").references(`${tables.Exchanges}.id`);

        table.uuid("ownerId").notNullable();
        table.foreign("ownerId").references(`${tables.Users}.id`);

        table.string("name").notNullable().defaultTo("default");

        table.string("encryptedCred1").notNullable();
        table.string("encryptedCred2").nullable();
    });

    // Add Fee
    await knex.schema.createTable(tables.Fees, table => {
        table.string("id")
            .primary()
            .notNullable()
            .unique();

        table.uuid("orderId").notNullable();
        table.foreign("orderId").references(`${tables.Orders}.id`);

        table.string("assetId").notNullable();
        table.foreign("assetId").references(`${tables.TradeSymbols}.id`);

        createMonetaryColumnLegacy(knex, table, "amount");
        createMonetaryColumnLegacy(knex, table, "rate");
    });

    // Allocation
    await knex.schema.createTable(tables.Allocations, table => {
        createCommonEntityFields(knex, table);

        table.uuid("exchangeAccountId").nullable();
        table.foreign("exchangeAccountId").references(`${tables.ExchangeAccounts}`)

        table.uuid("strategyId").notNullable();
        table.foreign("strategyId").references(`${tables.Strategies}.id`);
        table.string("name").nullable();
        table.boolean("live").notNullable().defaultTo(false);
        table.decimal("maxDrawdownPct").notNullable().defaultTo(0.2);
    });

    // AllocationItem
    await knex.schema.createTable(tables.AllocationItems, table => {
        createCommonEntityFields(knex, table);

        table.uuid("allocationId").notNullable();
        table.foreign("allocationId").references(`${tables.Allocations}.id`);

        table.string("symbolId").notNullable();
        table.foreign("symbolId").references(`${tables.TradeSymbols}.id`);

        createMonetaryColumnLegacy(knex, table, "amount");

        table.decimal("maxWagerPct")
            .notNullable()
            .defaultTo(0);

        //table.decimal("maxDrawdownPct")
        //    .notNullable()
        //    .defaultTo(constants.DEFAULT_ALLOCATION_DRAWDOWN_MAX_PCT);
    });

    // AllocationTransactionTypes
    await knex.schema.createTable(tables.AllocationTransactionTypes, table => {
        table.string("id").notNullable().unique();
        table.string("displayName").nullable();
    });


    // AllocationTransactionType values
    const types = [
        { id: AllocationTransactionType.FUND, displayName: "Fund", },
        { id: AllocationTransactionType.DEBIT, displayName: "Debit", },
        { id: AllocationTransactionType.CREDIT, displayName: "Credit" },
    ];

    for (const type of types) {
        await knex(tables.AllocationTransactionTypes).insert(type);
    }

    // AllocationTransaction
    await knex.schema.createTable(tables.AllocationTransactions, table => {
        createCommonEntityFields(knex, table);

        table.uuid("allocationItemId").notNullable();
        table.foreign("allocationItemId").references(`${tables.AllocationItems}.id`);

        table.uuid("orderId").nullable();
        table.foreign("orderId").references(`${tables.Orders}.id`);

        table.string("typeId").notNullable();
        table.foreign("typeId").references(`${tables.AllocationTransactionTypes}`);

        createMonetaryColumnLegacy(knex, table, "amount");
    });

    // Add fields to BotInstance
    await knex.schema.alterTable(tables.BotInstances, table => {
        table.uuid("allocationId").notNullable();
        table.foreign("allocationId").references(`${tables.Allocations}.id`);

        table.string("modeId").notNullable().defaultTo(BotMode.FORWARD_TEST);
        table.string("resId").notNullable().defaultTo(TimeResolution.FIFTEEN_MINUTES);
        table.string("name").notNullable();
        table.string("symbols").notNullable();
        table.string("type").notNullable().defaultTo("default");
        table.timestamp("prevTick").nullable();
        table.string("build").notNullable().defaultTo("");
        table.string("runState").notNullable().defaultTo(RunState.NEW);
        table.jsonb("stateInternal");
    });

    // Add fields to BotRun
    await knex.schema.alterTable(tables.BotRuns, table => {
        table.boolean("active").notNullable().defaultTo(false);
    });

    // Data
    const trx = knex as Knex.Transaction;
    const su = await addSystemUser(trx);
    const workspace = await addDefaultWorkspaceForSystemUser(trx, su.id);
    const plan = await addDefaultStratForSystemUserWorkspace(trx, su.id, workspace.id);

}

export async function addDefaultStratForSystemUserWorkspace(trx: Knex.Transaction, ownerId: string, workspaceId: string) {
    const strategy = await strats.getOrCreateDefaultStrategy(workspaceId, ownerId, trx);

    return strategy;
}

export async function addDefaultWorkspaceForSystemUser(trx: Knex.Transaction, uid: string) {
    const defaultWorkspaceProps: Partial<Workspace> = {
        description: "Default System Workspace",
        displayName: "Default",
        ownerId: uid,
    };

    // No workspace service at time of writing, so we'll insert by hand
    const ws = await query("migration.add-default-workspace", async db => {
        const [workspace] = <Workspace[]>await db(tables.Workspaces)
            .insert(defaultWorkspaceProps)
            .returning("*");

        return WorkspaceEntity.fromRow(workspace);
    }, trx);

    return ws;
}

export async function addSystemUser(trx: Knex.Transaction) {
    const systemUser: Partial<User> = {
        displayName: "System User",
        nameFirst: "System",
        nameLast: "User",
    };

    const newUser = await users.insertUser(systemUser, trx);
    return newUser;
}


export async function deleteNewData(trx: Knex.Transaction) {

    // Just an extra safety check...
    if (env.isStaging() || env.isProduction()) {
        throw new Error(`This should never occur`);
    }

    await query("migration.delete-default-workspace", async db => {
        await db(tables.AllocationTransactions).delete();
        await db(tables.Orders).delete();
        await db(tables.BotRuns).delete();
        await db(tables.BotInstances).delete();
        await db(tables.BotDefinitions).delete();
        await db(tables.AllocationItems).delete();
        await db(tables.Allocations).delete();
        await db(tables.Strategies).delete();
        await db(tables.Workspaces).delete();
        await db(tables.ExchangeAccounts).delete();
    }, trx);

    const systemUserId = await query("migration.delete-system-user", async db =>
        await db(tables.Users)
            .delete(), trx
    );
}

export async function down(knex: Knex.Transaction): Promise<void> {
    await deleteNewData(knex);

    await knex.schema.renameTable(tables.Strategies, "plans");
    await knex.schema.renameTable(tables.Modes, "plan_modes");

    await knex.schema.alterTable(tables.BotDefinitions, table => {
        table.dropColumn("name");
        table.dropColumn("normalizedGenome");
        table.dropColumn("symbols");
    });

    await knex.schema.alterTable(tables.BotInstances, table => {
        table.dropColumn("allocationId");
        table.dropColumn("name");
        table.dropColumn("modeId");
        table.dropColumn("resId");
        table.dropColumn("symbols");
        table.dropColumn("type");
        table.dropColumn("prevTick");
        table.dropColumn("build");
        table.dropColumn("runState");
        table.dropColumn("stateInternal");
    });

    await knex.schema.alterTable(tables.BotRuns, table => {
        table.dropColumn("active");
    });

    await knex.schema.dropTable(tables.AllocationTransactions);
    await knex.schema.dropTable(tables.AllocationTransactionTypes);
    await knex.schema.dropTable(tables.AllocationItems);
    await knex.schema.dropTable(tables.Allocations);
    await knex.schema.dropTable(tables.Fees);
    await knex.schema.dropTable(tables.ExchangeAccounts);
}
