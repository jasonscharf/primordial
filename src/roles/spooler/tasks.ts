
/** Task names */
export const names = {
    UPDATE_EXCHANGE_MARKET_DEFS: "markets.update.defs",
    UPDATE_SYMBOL_PRICES_GLOBAL_1M: "symbols.update.global",
    SYSTEM_CHECK_HEALTH: "system.health.check",
};


const seconds = 1;
const mins = seconds * 60;
const hours = mins * 60;


/**
 * Task frequencies, in seconds.
 */
export const freq = {
    [names.UPDATE_EXCHANGE_MARKET_DEFS]: 6 * hours,
    [names.UPDATE_SYMBOL_PRICES_GLOBAL_1M]: 1 * mins,
    [names.SYSTEM_CHECK_HEALTH]: 30 * seconds,
};
