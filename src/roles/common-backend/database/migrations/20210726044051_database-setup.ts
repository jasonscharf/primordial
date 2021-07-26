import { Knex } from "knex";
import env from "../../env";
import { db, log } from "../../includes";

const dbName = env.PRIMO_DB_NAME;
const EXTENSIONS = ["uuid-ossp", "timescaledb"];

const createScript = `
SELECT 'CREATE DATABASE ${dbName}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${dbName}');
`;

const dropScript = `
SELECT *
FROM pg_stat_activity
WHERE datname = '${dbName}';

SELECT	pg_terminate_backend (pid)
FROM	pg_stat_activity
WHERE	pg_stat_activity.datname = '${dbName}';

DROP DATABASE IF EXISTS ${dbName};
`;


export async function up(knex: Knex): Promise<void> {
    log.info(`Creating database '${dbName}'...`);
    await db.raw(createScript);

    for (const ext of EXTENSIONS) {
        log.info(`Enabling extension "${ext}"...`);
        await db.raw(`CREATE EXTENSION IF NOT EXISTS "${ext}" CASCADE`);
    }
}


export async function down(knex: Knex): Promise<void> {

    // Safety check! We would never, ever want to roll-back production to zero
    if (!env.isProduction()) {
        log.info(`Dropping database '${dbName}'...`);
        await db.raw(dropScript);
    }
}
