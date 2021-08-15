

/**
 * These variables are used to configure the entire system.
 */
const defaults = {
    PRIMO_MODE: "dev",
    PRIMO_HOSTNAME: "",
    PRIMO_DB_HOSTNAME: "db",
    PRIMO_DB_NAME: "primo",
    PRIMO_DB_PASSWORD: "primo",
    PRIMO_DB_USERNAME: "primo",
    PRIMO_DB_USE_SSL: "false",
    PRIMO_DB_PORT: 5432,
    PRIMO_MQ_HOSTNAME: "mq",
    PRIMO_MQ_USERNAME: "primo",
    PRIMO_MQ_PASSWORD: "primo",
    PRIMO_REDIS_PORT: 6379,
    PRIMO_REDIS_HOSTNAME: "redis",
    PRIMO_REDIS_PASSWORD: "primo",
    PRIMO_SERVER_PORT: "8000",
    PRIMO_ROLE_HEALTH_PORT: "8001",
    PRIMO_MULTIPART_FORM_UPLOAD_SIZE_LIMIT: "50mb",
    PRIMO_DEFAULT_EXCHANGE: "binance",
    PRIMO_DEFAULT_CURRENCY_QUOTE_SYMBOL: "BTC",
    PRIMO_SYSTEM_BINANCE_API_KEY: null,
    PRIMO_SYSTEM_BINANCE_API_SECRET: null,


    // NOTE: Changing these require database changes.
    PRIMO_CURRENCY_PRECISION: 21,
    PRIMO_CURRENCY_SCALE: 12,

    AZURE_APP_INSIGHTS_ID: "",
    CSRF_SECRET: "",
    SESSION_KEYS: "",

};

const allowedModes = [
    "test",
    "dev",
    "staging",
    "staging-dev",
    "staging-production",
    "production",
];

const funcs = {
    isTest: () => (env.PRIMO_MODE === "test" || env.PRIMO_MODE === ""),
    isDev: () => (env.PRIMO_MODE === "dev" || !env.isStagingOrProduction()),
    isStagingDev: () => env.PRIMO_MODE === "staging-dev",
    isStaging: () => env.PRIMO_MODE === "staging-production",
    isStagingOrProduction: () => env.isStaging() || env.isProduction(),
    isProduction: () => env.PRIMO_MODE === "production",
};

// Pull from actual environment vars, or use the defaults above
const env = <typeof defaults & typeof funcs>Object.assign({}, defaults, funcs);

Object
    .keys(defaults)
    .filter(key => typeof process.env[key] !== "undefined")
    .forEach(key => (env as any)[key] = process.env[key]);

if (allowedModes.indexOf(env.PRIMO_MODE) < 0) {
    throw new Error(`Unknown mode '${env.PRIMO_MODE}'`)
}

export = env;
