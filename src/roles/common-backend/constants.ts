import { Mode, Strategy } from "../common/models/system/Strategy";


export const DEFAULT_ALLOCATION_DRAWDOWN_MAX_PCT = 0.2;
export const DEFAULT_ALLOCATION_MAX_WAGER = 0.1;

export const DEFAULT_SYMBOL_PAIR = "BTC/TUSD";
export const DEFAULT_GENOME = "RSIL=20|RSIH=60";
export const DEFAULT_STRATEGY_NAME = "default";
export const DEFAULT_STRATEGY: Partial<Strategy> = {
    displayName: DEFAULT_STRATEGY_NAME,
    name: DEFAULT_STRATEGY_NAME,
    modeId: Mode.BACK_TEST,

    // Must be set by consumers
    workspaceId: null,
};

/**
 * Global command names
 */
export enum commands {
    CMD_BOTS_CREATE = "cmd.bots.create",
    CMD_BOTS_LIST = "cmd.bots.list",
    CMD_BOTS_PAUSE = "cmd.bots.pause",
    CMD_BOTS_START = "cmd.bots.start",
    CMD_BOTS_STOP = "cmd.bots.stop",
    CMD_BOTS_TEST = "cmd.bots.test",
}

/**
 * Global event names
 */
export enum events {
    EVENT_PRICE_UPDATE = "events.symbols.prices.update",
    EVENT_ORDER_STATUS_UPDATE = "events.orders.update.status",
}


/**
 * Database tables.
 * NOTE: *NEVER* modify the values. These are used in migrations, which require stable values to work.
 * Add new values and deprecate old ones.
 */
export enum tables {
    Allocations = "allocs",
    AllocationItems = "alloc_items",
    AllocationTransactions = "alloc_transactions",
    AllocationTransactionTypes = "alloc_transaction_types",
    BotDefinitions = "bot_definitions",
    BotInstances = "bot_instances",
    BotRuns = "bot_runs",
    BotTypes = "bot_types",
    Events = "events",
    Exchanges = "exchanges",
    ExchangeAccounts = "exchange_accounts",
    Fees = "fees",
    Markets = "markets",
    Modes = "modes",
    Orders = "orders",
    OrderFills = "order_fills",
    OrderStates = "order_states",
    OrderTypes = "order_types",
    Prices = "prices",
    SpoolerTasks = "spooler_tasks",
    Strategies = "strategies",
    StrategyRuns = "strategy_runs",
    TimeResolutions = "time_resolutions",
    TradeSymbols = "symbols",
    TradeSymbolTypes = "symbol_types",
    Users = "users",
    UserIdentities = "user_identities",
    UserInvites = "user_invites",
    Workspaces = "workspaces",

    // Deprecated
    Plans = "plans",
    PlanModes = "plan_modes",
}

/**
 * Redis caching timeouts, in seconds.
 * Pay careful attention to the relationships between cache TTL and task frequencies.
 */
export const caching = {

    // Market defs last an hour, even though the task to refresh them may run more frequently.
    EXP_MARKETS_ALL: 60 * 60,
};

/**
 * Query names for logging and performance tracking purposes.
 */
export const queries = {
    ALLOCS_GET_LEDGER: "allocations.get-ledger",
    ALLOCS_CREATE_TEST_ALLOC: "allocations.create-testing-alloc",
    ALLOCS_GET_ITEM_FOR_BOT: "allocations.get-item-for-bot",
    BOTS_DEFS_CREATE: "bots.defs.create",
    BOTS_DEFS_GET_BY_NAME: "bots.defs.gets.get-by-name",
    BOTS_GET_BOT_FOR_ORDER: "bots.get-for-order",
    BOTS_INSTANCES_ACTIVE_LIST_ALL: "bots.instances.active.list.all",
    BOTS_INSTANCES_CREATE_FROM_DEF: "bots.instances.create.from-def",
    BOTS_INSTANCES_FORK: "bots.instances.fork",
    BOTS_INSTANCES_GET: "bots.instances.get",
    BOTS_INSTANCES_PAUSE: "bots.instances.pause",
    BOTS_INSTANCES_STOP: "bots.instances.stop",
    BOTS_INSTANCES_TO_INIT: "bots.instances.need-init",
    BOTS_INSTANCES_UPDATE: "bots.instances.update",
    BOTS_LIST: "bots.list",
    BOTS_RUNS_START: "bots.runs.start",
    BOTS_RUNS_LATEST_GET: "bots.runs.get-latest",
    BOTS_RUNS_LIST: "bots.runs.list",
    BOTS_RUNS_STOP: "bots.runs.stop",
    ORDERS_CREATE: "orders.create",
    ORDERS_FEES_SAVE: "orders.fees",
    ORDERS_UPDATE: "orders.update",
    ORDERS_SAVE_FILLS: "orders.fills.create.bulk",
    STRATEGIES_CREATE: "strategies.create",
    STRATEGIES_GET_OR_CREATE_DEFAULT: "stategies.get-or-create-default",
    STRATEGIES_PAUSE: "strategies.pause",
    STRATEGIES_START: "strategies.start",
    STRATEGIES_STOP: "strategies.stop",
    SYMBOLS_ADD: "symbols.add",
    SYMBOLS_GET: "symbols.get",
    SYMBOLS_PRICES_ADD: "symbols.prices.add",
    SYMBOLS_PRICES_ADD_BULK: "symbols.prices.add.bulk",
    SYMBOLS_LIST: "symbols.list",
    SYMBOLS_LIST_NAMES: "symbols.list.names",
    SYMBOLS_PRICES_QUERY: "symbols.prices.query",
    SYMBOLS_PRICES_RANGES: "symbols.prices.ranges",
    SYSTEM_GET_SYSTEM_USER: "system.get-system-user",
    TASKS_ADD: "tasks.add",
    TASKS_GET_PENDING: "tasks.get.pending",
    TASKS_MARK_NOT_RUNNING: "tasks.mark.not-running",
    TRANSACTIONS_CREATE: "transactions.create",
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

/**
 * Message queue topology naming.
*/
export const queue = {
    CHANNEL_WORKER_LO: "worker.lo",
    CHANNEL_WORKER_HI: "worker.hi",
    CHANNEL_RPC_REQUEST: "rpc.request",
    CHANNEL_RPC_RESPONSE: "rpc.response",
    CHANNEL_RPC_RESPONSE_CLI: "rpc.response.cli",
};

