import knex, { Knex } from "knex";
import { OnlyInstantiableByContainer, Inject } from "typescript-ioc";
import env from "../../common-backend/env";
import { log } from "../../common-backend/includes";


@OnlyInstantiableByContainer
export class DatabaseManager {
    protected _db: Knex;


    get db() {
        return this._db;
    }

    constructor() {
        this._db = createKnexConnection();
    }

    public async migrate() {
        log.info("Migrating database...");

        await this._db.migrate.latest(KNEX_CONFIG.migrations);

        const status = await this._db.migrate.status();
        log.info(`Migration complete. Status: ${status}`);
    }

    public async rollback(all: boolean = false) {
        await this._db.migrate.rollback(KNEX_CONFIG.migrations, all);
    }

    public async down() {
        await this._db.migrate.down(KNEX_CONFIG.migrations);
    }
}

export const pool: Knex.PoolConfig = {
    propagateCreateError: false,
    max: 50,
};

export const KNEX_CONFIG: Knex.Config<any> = {
    client: "pg",
    connection: {
        host: env.PRIMO_DB_HOSTNAME,
        port: env.PRIMO_DB_PORT,
        user: env.PRIMO_DB_USERNAME,
        password: env.PRIMO_DB_PASSWORD,
        database: env.PRIMO_DB_NAME,
        ssl: env.PRIMO_DB_USE_SSL === "true",
       pool,
    },
    migrations: {
        tableName: "knex_migrations",
        directory: `${__dirname}/migrations`,
        loadExtensions: [".js"]
    }
};


let connection: Knex | null = null;
export function createKnexConnection(config: Knex.Config<any> = KNEX_CONFIG): Knex {
    if (!connection) {
        const appliedConfig = Object.assign({}, KNEX_CONFIG, config);
        connection = knex(appliedConfig as Knex.Config);

    }
    return connection;
}

export async function closeKnexConnection() {
    if (connection) {
        console.log("Closing database connection...");
        connection.removeAllListeners();
        await connection.destroy();
        console.log("Database connection closed.");
    }
}
