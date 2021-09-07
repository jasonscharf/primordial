/**
 * Describes the nature of the type of a bot instance.
 */
export enum BotType {

    // Human-created
    SEED = "root",

    // Paper clone of a live trading bot. Used to compare live and test results in order to derive insight
    // into slippage and real world performance vs backtest.
    PAPER_CLONE = "clone-paper",

    // Descendant of a seed
    DESCENDANT = "desc",
}
