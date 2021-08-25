/**
 * Describes the run state of a strategy or bot.
 */
export enum RunState {
    NEW = "new",
    INITIALIZING = "initializing",
    ACTIVE = "active",
    PAUSED = "paused",
    STOPPED = "stopped",
    ERROR = "error",
}
