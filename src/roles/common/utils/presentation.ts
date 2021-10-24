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

export function presentDuration(duration, args = {}) {
    if (!duration) {
        return "(unknown)";
    }

    const appliedArgs = Object.assign({}, DEFAULT_PRESENT_DURATION_ARGS, args);
    const { abs, short, noMs, noSeconds } = appliedArgs;

    const { days, hours, milliseconds, minutes, seconds } = duration;

    const numMilliseconds = abs ? Math.abs(milliseconds) : milliseconds;
    const numSeconds = abs ? Math.abs(seconds) : seconds;
    const numMinutes = abs ? Math.abs(minutes) : minutes;
    const numHours = abs ? Math.abs(hours) : hours;
    const numDays = abs ? Math.abs(days) : days;

    let pieces: string[] = [];
    if (Math.abs(numDays) > 0) {
        pieces.push(numDays + (short ? "d" : " days"));
    }
    if (Math.abs(numHours) > 0) {
        pieces.push(numHours + (short ? "h" : " hours"));
    }
    if (Math.abs(numMinutes) > 0) {
        pieces.push(numMinutes + (short ? "m" : " mins"));
    }
    if (!noSeconds && Math.abs(numSeconds) > 0) {
        pieces.push(numSeconds + (short ? "s" : " secs"));
    } 
    if (!noMs && Math.abs(numMilliseconds) > 0) {
        pieces.push(numMilliseconds + (short ? "ms" : " ms"));
    }

    return pieces.join(", ");
}
