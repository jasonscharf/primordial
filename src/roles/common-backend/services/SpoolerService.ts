import { SpoolerTask } from "../../common/models/system/SpoolerTask";
import { SpoolerTaskEntity } from "../../common/entities/SpoolerTaskEntity";
import { SpoolerTaskHandler, SpoolerTaskProgressHandler } from "../system/SpoolerTaskHandler";
import { db, log, tasks } from "../includes";
import { queries, tables } from "../constants";
import { query } from "../database/utils";


/**
 * Handles the reading and writing of recurring and one-time spooler tasks.
 */
export class SpoolerService {
    protected _handlers = new Map<string, SpoolerTaskHandler>();

    /**
     * Adds a task to the database.
     * @param props
     */
    async addTask<T>(props: Partial<SpoolerTask<T>>): Promise<SpoolerTaskEntity> {
        return query(queries.TASKS_ADD, async trx => {
            const [task] = <SpoolerTaskEntity[]>await db(tables.SpoolerTasks)
                .insert(props)
                .returning("*")
                ;

            return task;
        });
    }

    /**
     * Gets all pending/repeatable tasks from the database.
     */
    async getPendingTasks(): Promise<SpoolerTaskEntity[]> {
        return query(queries.TASKS_GET_PENDING, async trx => {
            const rows = <SpoolerTask[]>await db(tables.SpoolerTasks)
                .whereNotNull("frequencySeconds")
                .orderBy("frequencySeconds")
                .transacting(trx)
                ;

            return rows.map(SpoolerTaskEntity.fromRow);
        });
    }

    /**
     * Marks a set of tasks as no longer running.
     * @param taskIds 
     */
    async markTasksAsNotRunning(taskIds: string[]): Promise<void> {
        return query(queries.TASKS_MARK_NOT_RUNNING, async db => {
            await db(tables.SpoolerTasks)
                .update({ isRunning: false })
                .whereIn("id", taskIds)
                ;
        });
    }

    /**
     * Registers a handler with a given name.
     * Throws if a handler with the name has already been added.
     * @param name 
     * @param handler 
     */
    registerHandler(name: string, handler: SpoolerTaskHandler) {
        if (this._handlers.has(name)) {
            throw new Error(`Handler '${name}' already exists`);
        }

        this._handlers.set(name, handler);
    }

    /**
     * Gets a task by ID.
     * @param id 
     */
    async getTask(id: string): Promise<SpoolerTaskEntity> {
        const [task] = <SpoolerTaskEntity[]>await db(tables.SpoolerTasks)
            .where({ id })
            .limit(1)
            ;

        return task;
    }

    /**
     * Returns true if there are any tasks at all, even completed ones.
     */
    async hasAnyTasks(): Promise<boolean> {
        interface CountResults {
            count: Number;
        }
        const [res] = <CountResults[]>await db(tables.SpoolerTasks)
            .count()
            ;

        return res.count > 0;
    }

    /**
     * Runs a task, given a task record.
     * @param latestTask
     */
    async runTask<TState = unknown>(task: SpoolerTaskEntity): Promise<TState | null> {

        // TODO: Obtain a transaction here to lock the row or table. This is an extra level of
        // protection against a case where the spooler is killed off before marking the task as non-running.


        if (!task.id) {
            throw new Error(`Missing ID. Pass a serialized task.`);
        }

        // Re-query the task so we have latest
        const taskFromDb = await this.getTask(task.id);

        const { id, name, runCount, state } = taskFromDb;
        const handler = this.getHandler(taskFromDb.name);

        const progress: SpoolerTaskProgressHandler = (p: number, msg: string) =>
            console.log(`Task '${name}' (${id}) at ${progress}%`);


        if (taskFromDb.isRunning) {
            log.warn(`Not running task '${name}' (${id}) - task already running`);
            return task.state as TState;
        }

        if (taskFromDb.frequencySeconds === 0 && taskFromDb.runCount > 0) {
            throw new Error(`Task '${name}' (${id}) has already been run.`);
        }

        try {
            taskFromDb.prevRun = new Date();
            log.debug(`Running task '${name}' (${id})...`);


            await db(tables.SpoolerTasks)
                .where({ id })
                .limit(1)
                .update({ isRunning: true })
                ;

            const output = await handler(state, progress);
            const nextRun: Date = taskFromDb.frequencySeconds > 0
                ? new Date(Date.now() + (taskFromDb.frequencySeconds * 1000))
                : null
                ;

            await db(tables.SpoolerTasks)
                .where({ id })
                .limit(1)
                .update({
                    state: output,
                    isRunning: false,
                    nextRun,
                    prevRun: new Date(),
                    runCount: runCount + 1,
                })
                ;

            return output as TState;
        }
        catch (err) {
            log.error(`Error running task '${taskFromDb.name}' (${taskFromDb.id})`, err);
            throw err;
        }
        finally {
            await db(tables.SpoolerTasks)
                .where({ id })
                .limit(1)
                .update({ isRunning: false })
                ;
        }
    }

    /**
     * Returns a task handler by name if it exists.
     * Throws if it does not exist.
     */
    getHandler(name: string): SpoolerTaskHandler {
        if (!this._handlers.has(name)) {
            throw new Error(`Unknown handler '${name}'`);
        }

        return this._handlers.get(name);
    }
}
