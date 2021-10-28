/**
 * Describes the nature of a MutationSet.
 */
export enum MutationSetType {

    // REMINDER: These are stored in the DB. Take care when changing.

    // Human mutates a backtest to find better backtests
    MANUAL_BACK_TEST_MUTATE = "manual.mutate.back-test",

    // Human elevates backtest -> fwd test
    MANUAL_ELEVATE_TO_FWD = "manual.elevate.to-fwd-test",

    // Human elevant fwd test -> live test
    MANUAL_ELEVATE_TO_LIVE_TEST = "manual.elevate.to-live-test",

    // Human elevant fwd test -> LIVE
    MANUAL_ELEVATE_TO_LIVE = "manual.elevate.to-live",

    // System mutates backtest to backtest to find better backtests
    SYSTEM_BACK_TEST_MUTATE = "system.mutate.back-test",

    // System mutates backtest to backtest recent time period
    SYSTEM_ELEVATE_TO_FWD = "system.elevate.to-fwd-test",

    // System mutates running fwd tests for tuning
    SYSTEM_ELEVATE_TO_LIVE_TEST = "system.elevate.to-live-test",

    // System elevates live test to production
    SYSTEM_ELEVATE_TO_LIVE = "system.elevate.to-live",
}
