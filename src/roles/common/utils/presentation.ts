import { GeneticBotFsmState } from "../models/bots/BotState";


export function presentBotState(fsmState: GeneticBotFsmState) {
    switch (fsmState) {
        case GeneticBotFsmState.SURF_BUY:
            return `buying`;
        case GeneticBotFsmState.SURF_SELL:
            return `selling`;
        case GeneticBotFsmState.WAITING_FOR_BUY_OPP:
            return `wait for buy opp`;
        case GeneticBotFsmState.WAITING_FOR_SELL_OPP:
            return `wait for sell opp`;
        case GeneticBotFsmState.WAITING_FOR_BUY_ORDER_CONF:
            return `waiting for buy confirmation...`;
        case GeneticBotFsmState.WAITING_FOR_SELL_ORDER_CONF:
            return `wait for sell confirmation...`;
        default:
            return fsmState;
    }
}
