import { constants } from "buffer";
import * as http from "http2";
import Koa from "koa";
import env from "../common-backend/env";
import * as tasks from "./tasks";
import { SpoolerTask } from "../common/models/system/SpoolerTask";
import { UpdateSymbolsState } from "../common-backend/services/SymbolService";
import { connectToBinanceWebSocket, disconnectBinanceWebSocket } from "./binance-socket";
import { dbm, log, mq } from "../common-backend/includes";
import { registerCommandHandlers } from "../common-backend/commands/command-handlers";
import { shortTime } from "../common/utils/time";
import { spooler, sym } from "../common-backend/services";
import { systemHealthCheck } from "./tasks/SystemHealthCheck";
import { updateMarketDefs } from "./tasks/UpdateMarketDefs";
import { updateSymbolPricesGlobal } from "./tasks/UpdateSymbolPricesGlobal";


// Note: A health check is required for cluster health
const healthCheck = new Koa();
healthCheck.listen(env.PRIMO_ROLE_HEALTH_PORT);
healthCheck.use((ctx, next) => ctx.status = http.constants.HTTP_STATUS_OK);


// Top-level spooler entrypoint. 
(async function load() {
    try {
        log.info(`Spooler startup...`);

        await dbm.migrate();
        await mq.connectAsPublisher();

        // IMMEDIATE PRIORITY is to start/resume broadcasting prices to the rest of the cluster ASAP
        await addStreamingPriceWatchers();

        // Register command implementations
        await registerCommandHandlers();

        // Register task implementations
        await registerTaskHandlers();

        // Persist the default tasks for this build, if none exist
        await createDefaultTasksIfNoneExist();

        // Schedule persisted tasks to run
        // Note: This is called by SYSTEM_REFRESH_TASKS to periodically refresh task models
        await refreshTasksForExecution();

    }
    catch (err) {
        log.error(`FATAL: Spooler startup error`, err);
        log.error(`Calling shutdown...`);
        await shutdown();
    }
})();


/**
 * Registers spooler task implementations.
 */
async function registerTaskHandlers() {
    spooler.registerHandler(tasks.names.UPDATE_EXCHANGE_MARKET_DEFS, updateMarketDefs);
    spooler.registerHandler(tasks.names.UPDATE_SYMBOL_PRICES_GLOBAL_1M, updateSymbolPricesGlobal);
    spooler.registerHandler(tasks.names.SYSTEM_CHECK_HEALTH, systemHealthCheck);
}


// TODO: Move some of this into SpoolerService.
/**
 * This method schedules mission-critical platform services to be run periodically.
 * For example, keeping market-wide prices up-to-date for analysis, or forecasting macro changes.
 * 
 */
async function createDefaultTasksIfNoneExist() {
    const hasTasks = await spooler.hasAnyTasks();
    if (hasTasks) {
        return;
    }

    log.info(`No spooler tasks found. Creating default ones...`);


    // NOTE: Currently applies a filter to limit markets to the default quote currency, e.g. ETH, BUSD, USDT
    const symbolsToTrack: UpdateSymbolsState = {
        filterByQuote: env.PRIMO_DEFAULT_CURRENCY_QUOTE_SYMBOL,
    };

    // TODO: To defaults

    //
    // TASK: Update market definitions
    //
    const updateMarketDefsTask: Partial<SpoolerTask> = {
        name: tasks.names.UPDATE_EXCHANGE_MARKET_DEFS,
        displayName: `Update market definitions for all known exchanges`,
        frequencySeconds: tasks.freq[tasks.names.UPDATE_EXCHANGE_MARKET_DEFS],
        state: symbolsToTrack,
    };

    //
    // TASK: Update symbols for known/desired markets
    //
    const updateSymbolPricesGlobalTask: Partial<SpoolerTask<UpdateSymbolsState>> = {
        name: tasks.names.UPDATE_SYMBOL_PRICES_GLOBAL_1M,
        displayName: `Update global symbols @ 1m`,
        frequencySeconds: tasks.freq[tasks.names.UPDATE_SYMBOL_PRICES_GLOBAL_1M],
        state: symbolsToTrack,
    };

    //
    // TASK: System health check
    //
    const systemHealthCheckTask: Partial<SpoolerTask<void>> = {
        name: tasks.names.SYSTEM_CHECK_HEALTH,
        displayName: `System health check`,
        frequencySeconds: tasks.freq[tasks.names.SYSTEM_CHECK_HEALTH],
    };

    await spooler.addTask(updateMarketDefsTask);
    await spooler.addTask(updateSymbolPricesGlobalTask);
    await spooler.addTask(systemHealthCheckTask);
}


const intervals = [];
function clearTaskIntervals() {
    intervals.forEach(i => clearInterval(i));
}

let taskRefreshTimeout: NodeJS.Timeout;
function scheduleRefreshTasks() {
    if (taskRefreshTimeout) {
        clearTimeout(taskRefreshTimeout);
    }
    // Note: Use of timeout vs interval here is because the refresh method will reschedule itself.
    // This is so that interval handlers don't accumulate while the spooler is paused in the debugger,
    // or running some blocking, long-lived task (which it ideally never does)
    taskRefreshTimeout = setTimeout(refreshTasksForExecution, 2000);
}


// Track any tasks that this instance is currently running
const locallyRunningTasks = new Map<string, boolean>();

/**
 * Refreshes the system's recurring tasks, pulling them from the database and
 * ensuring that task handlers are scheduled to run at their designated times.
 * @param state 
 */
async function refreshTasksForExecution(state?: unknown) {

    clearTaskIntervals();

    if (!await spooler.hasAnyTasks()) {
        //await spooler.
    }

    const tasks = await spooler.getPendingTasks();
    for (const task of tasks) {
        const { frequencySeconds, id, name, nextRun, prevRun, runCount } = task;
        const now = new Date();

        let msToNextRun = -1;

        // TODO: Handle and test edge cases
        // TODO: Delta-T


        if (nextRun) {
            msToNextRun = Math.max(0, (nextRun.getTime() - now.getTime()));

            if (msToNextRun < 0) {
                console.debug(`Task '${name}' (${id}) was set to run at ${shortTime(nextRun)} but that elapsed. Running now...`);
            }
            else {
                //console.debug(`Task '${name}' (${id}) set to run at ${shortTime(nextRun)} in ${msToNextRun / 1000} seconds`);
            }
        }

        if (msToNextRun < 0 && frequencySeconds > 0) {
            msToNextRun = frequencySeconds * 1000;
        }

        if (!prevRun && runCount === 0) {
            msToNextRun = 0;
        }

        // Task runner
        const capturedTask = task;
        const interval = setTimeout(async () => {
            let start = 0;
            let end = 0;
            try {
                start = Date.now();

                if (capturedTask.isRunning) {
                    return;
                }

                locallyRunningTasks.set(capturedTask.id, true);

                // runTask will also set the nextRun timestamp
                await spooler.runTask(capturedTask);

                locallyRunningTasks.set(capturedTask.id, false);
            }
            catch (err) {
                log.error(`Unhandled error running task '${name}' (${id})`, err);
            }
            finally {
                end = Date.now();
                const duration = end - start;
                //log.debug(`Done task '${name}' (${id}) in ${duration}ms`);
            }

        }, msToNextRun);
        intervals.push(interval);
    }

    // Schedule the next call to this method. By doing so, and rather than using an interval,
    // we won't get unrun handlers queuing up when the debugger is paused, or the app otherwise blocked.
    scheduleRefreshTasks();
}

async function addStreamingPriceWatchers() {
    // ... pull watchlist from database
    // ... if no listener exists for each symbol, add it!
    await connectToBinanceWebSocket();
}

async function shutdown() {
    clearTaskIntervals();
    clearInterval(taskRefreshTimeout);

    try {
        disconnectBinanceWebSocket();
    }
    catch (err) {
        log.error(`Error disconnecting Binance socket`, err);
    }

    // TODO: Mark all currently running tasks as non-running.
    const running = Array.from(locallyRunningTasks.entries())
        .filter(([k, v]) => v)
        .map(([k, v]) => k)
        ;

    await spooler.markTasksAsNotRunning(running).then(() => `Marked ${running.length} task(s) as no longer running`);
}


let hasHandledProcessTermination = false;
function handleProcessTermination() {
    if (hasHandledProcessTermination) {
        return;
    }
    else {
        hasHandledProcessTermination = true;
    }

    log.info(`Spooler receives SIGTERM/SIGUSR2. Shutting down...`);
    shutdown()
        .catch(err => {
            log.error(`Error on spooler shutdown`, err);
        })
        .finally(() => {
            log.info(`Spooler shutdown complete. Exiting process (${process.pid})`);
            process.exit(0);
        });
}

process.on("SIGTERM", handleProcessTermination);
