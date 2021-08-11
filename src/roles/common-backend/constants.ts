export enum tables {
    BotDefinitions = "bot_definitions",
    BotInstances = "bot_instances",
    BotRuns = "bot_runs",
    Events = "events",
    Exchanges = "exchanges",
    Markets = "markets",
    Orders = "orders",
    OrderFills = "order_fills",
    OrderStates = "order_states",
    Plans = "plans",
    PlanModes = "plan_modes",
    PlanRuns = "plan_runs",
    Prices = "prices",
    SpoolerTasks = "spooler_tasks",
    TimeResolutions = "time_resolutions",
    TradeSymbols = "symbols",
    TradeSymbolTypes = "symbol_types",
    Users = "users",
    UserIdentities = "user_identities",
    UserInvites = "user_invites",
    Workspaces = "workspaces",
}

/**
 * Redis caching timeouts, in seconds.
 * Pay careful attention to the relationships between cache TTL and task frequencies.
 */
export const caching = {

    // Market defs last an hour, even though the task to refresh them may run more frequently.
    EXP_MARKETS_ALL: 60 * 60,
};

export const queries = {
    SYMBOLS_ADD: "symbols.add",
    SYMBOLS_GET: "symbols.get",
    SYMBOLS_PRICES_ADD: "symbols.prices.add",
    SYMBOLS_PRICES_ADD_BULK: "symbols.prices.add.bulk",
    SYMBOLS_LIST: "symbols.list",
    SYMBOLS_LIST_NAMES: "symbols.list.names",
    SYMBOLS_PRICES_QUERY: "symbols.prices.query",
    SYMBOLS_PRICES_RANGES: "symbols.prices.ranges",
    TASKS_ADD: "tasks.add",
    TASKS_GET_PENDING: "tasks.get.pending",
    TASKS_MARK_NOT_RUNNING: "tasks.mark.not-running",
};


/**
 * General system limits.
 */
export const limits = {

    // Maximum OLHC entries _for any exchange_.
    // 1000 is for Binance specifically.
    // This should be empirically adjusted when multi-exchange is used.
    MAX_API_PRICE_FETCH_OLHC_ENTRIES: 1000,
};
