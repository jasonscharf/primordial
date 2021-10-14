export enum GeneticBotFsmState {
    WAITING_FOR_BUY_OPP = "wait-for-buy-opp",
    WAITING_FOR_SELL_OPP = "wait-for-sell-opp",
    WAITING_FOR_BUY_ORDER_CONF = "wait-for-buy-order-conf",
    WAITING_FOR_SELL_ORDER_CONF = "wait-for-sell-order-conf",
    SURF_SELL = "sell-surf",
    SURF_BUY = "buy-surf",
}
