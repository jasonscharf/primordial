import knex, { Knex } from "knex";
import env from "./env";


export const pool: Knex.PoolConfig = {
    propagateCreateError: false,
    max: 50,
};

const KNEX_CONFIG: Knex.Config<any> = {
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
        directory: `${__dirname}/database/migrations`,
        loadExtensions: [".js"]
    }
};

export default KNEX_CONFIG;
