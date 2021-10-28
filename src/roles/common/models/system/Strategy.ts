import { MutableModel } from "../MutableEntity";


/**
 * NOTE: These constants are used in the database.
 * DO NOT remove of change values here. Add and deprecate.
 */
export enum BotMode {
    BACK_TEST = "test-back",
    FORWARD_TEST = "test-forward",
    LIVE = "live",
    LIVE_TEST = "test-live",

    // @deprecated
    PAUSED = "paused",
}

export interface Strategy extends MutableModel {
    ownerId: string;
    workspaceId: string;
    modeId: BotMode;
    name: string;

    /* FUTURE SETTINGS
    - strategy stop loss (maxDrawdown)
    - allow elevation of fwd tests to live tests or live
    - auto mutate backtests
    - auto test backtest in recent time period, e.g. 24 hrs, week, month
    - portfolio fitness function model params
    - elevation time frames for model selection:
        - how long to forward test

    - designate/require a special allocation for live tests
    - model all these as a separate entity (payloaded in Strategy) that is tracked over time (!!!)
        - For example, if the fitness function parameters for a strat change, it can be tracked against rolling metrics/reports
    */
}
