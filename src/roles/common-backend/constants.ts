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
 */
export const caching = {
    EXP_MARKETS_ALL: 60,
};

export const queries = {
    SYMBOLS_ADD: "symbol.add",
    SYMBOLS_PRICE_ADD: "symbol.price.add",
    SYMBOLS_LIST: "symbols.list",
    SYMBOLS_LIST_NAMES: "symbols.list.names",
    TASKS_ADD: "tasks.add",
    TASKS_GET_PENDING: "tasks.get.pending",
};
