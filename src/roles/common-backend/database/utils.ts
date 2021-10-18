import { Knex } from "knex";
import { Money } from "../../common/numbers";
import env from "../env";
import { db } from "../includes";


/**
 * Creates a shallow clone of a model with Money types stringified for proper database insert.
 * @param obj 
 * @returns 
 */
export function moneytize(obj: unknown) {
    const clone = {};
    for (const k of Object.keys(obj)) {
        if (obj[k] instanceof Money) {
            clone[k] = (obj[k] as Money).round(11).toString();
        }
        else {
            clone[k] = obj[k];
        }
    }
    return clone;
}


/**
 * Wrapped query for transactions-by-default, logging, introspection.
 * @param name Name to use for logging
 * @param fn 
 * @param trx 
 * @returns 
 */
export async function query<T>(name: string, fn: (trx: Knex.Transaction) => Promise<T>, trx?: Knex.Transaction): Promise<T> {

    // TODO: Log level, timing, etc
    console.log(`Run query '${name}'...`);
    const start = Date.now();
    let result: T;

    if (!trx) {
        trx = await db.transaction();
    }

    // 
    trx.raw(`SET application_name = '${name}';`);
    result = await fn(trx);

    const end = Date.now();
    const duration = end - start;

    //console.log(`Done query '${name}' in ${duration}ms`);

    return result;
}

/**
 * Little helper function for writing Knex queries.
 * @param table 
 * @param col 
 * @returns 
 */
export function ref(table: string, col = "id") {
    return `${table}.${col}`;
}


/**
 * Create common entity fields, such as a UUID primary key, and created and updated timestamps.
 * @param knex 
 * @param table 
 * @param uuid 
 */
export function createCommonEntityFields(knex: Knex, table: Knex.CreateTableBuilder, uuid = true) {

    if (!uuid) {
        table.string("id")
            .primary();
    }
    else {
        // Note: Requires the UUID extension, which should have previously
        // been installed by this role.
        table.uuid("id")
            .primary()
            .defaultTo(knex.raw("uuid_generate_v4()"));
    }

    table.string("displayName").nullable();
    table.timestamp("created")
        .notNullable()
        .defaultTo(knex.fn.now())
        ;
    table.timestamp("updated")
        .notNullable()
        .defaultTo(knex.fn.now())
        ;
}


/**
 * Creates a high-precision numeric column suitable for use with cryptocurrencies,
 * where some currencies have indivisible units into 12 digits or more.
 * @param knex 
 * @param table 
 * @param colName 
 */
export function createMonetaryColumn(knex: Knex, table: Knex.CreateTableBuilder, colName: string) {
    return table
        .decimal(colName, env.PRIMO_CURRENCY_PRECISION, env.PRIMO_CURRENCY_SCALE)
        .notNullable()
        .defaultTo(0)
        ;
}

/**
 * Enables TimescaleDB compression.
 * Note: For data that is retroactively updated ("back-filled"), compression comes with overhead.
 * Back-filled chunks must be manually decoded and there are some other concerns as well.
 * @param knex 
 * @param tableName 
 * @param segmentColName 
 */
export async function enableCompression(knex: Knex, tableName: string, segmentColName: string) {
    return await knex.raw(`
        ALTER TABLE ${tableName} SET (
            timescaledb.compress,
            timescaledb.compress_segmentby = '${segmentColName}'
        );
    `);
}
