import { GeneticBotFsmState } from "../models/bots/BotState";
import { RunState } from "../models/system/RunState";
import { isNullOrUndefined } from "../utils";


export function presentBotState(fsmState: GeneticBotFsmState, runState?: RunState) {
    if (runState === RunState.STOPPED) {
        return "stopped";
    }
    else if (runState === RunState.PAUSED) {
        return "paused";
    }
    else if (runState === RunState.ERROR) {
        return "error";
    }
    else {
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
}

export interface Duration {
    days: number;
    hours: number;
    milliseconds: number;
    minutes: number;
    seconds: number;
}

export interface PresentDurationArgs {
    abs?: boolean;
    short?: boolean;
    noMs?: boolean;
    noSeconds?: boolean;
}

export const DEFAULT_PRESENT_DURATION_ARGS: PresentDurationArgs = {
    abs: true,
    short: false,
    noMs: true,
    noSeconds: true,
};
