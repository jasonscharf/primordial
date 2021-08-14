/**
 * Represents the handler call signature for spooler tasks.
 */
export type SpoolerTaskHandler<TState = unknown, TResult = unknown> =
(state: TState, progress?: SpoolerTaskProgressHandler) => TResult;


/**
 * Used for logging progress messages about a task.
 */
export type SpoolerTaskProgressHandler = (progress: number, msg?: string) => void;
