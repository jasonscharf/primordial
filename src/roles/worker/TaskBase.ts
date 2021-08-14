/**
 * Represents the implementation of a task handler, typically implemented by worker roles.
 */
export interface TaskBase<TInput, TOutput = void> {

    /**
     * Executes the task. If `progress` is supplied, the task can broadcast its
     * estimated percentage of completion (optional).
     * @param params 
     * @param progress 
     */
    execute(params: TInput, progress?: (msg: string, percentComplete?: number) => void): Promise<TOutput>;
}
