import knex, { Knex } from "knex";
import env from "../env";
import { BacktestRequest } from "../messages/testing";
import { BotDefinition } from "../../common/models/bots/BotDefinition";
import { BotDefinitionEntity } from "../../common/entities/BotDefinitionEntity";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotInstanceDescriptor } from "../../common/models/BotInstanceDescriptor";
import { BotInstanceEntity } from "../../common/entities/BotInstanceEntity";
import { BotRun } from "../../common/models/bots/BotRun";
import { BotRunEntity } from "../../common/entities/BotRunEntity";
import { Mode, Strategy } from "../../common/models/system/Strategy";
import { OrderEntity } from "../../common/entities/OrderEntity";
import { PrimoUnknownName } from "../../common/errors/errors";
import { RunState } from "../../common/models/system/RunState";
import { StrategyEntity } from "../../common/entities/StrategyEntity";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { Workspace } from "../../common/models/system/Workspace";
import { WorkspaceEntity } from "../../common/entities/WorkspaceEntity";
import { botIdentifier } from "../bots/BotContext";
import { constants, db, log } from "../includes";
import { queries, tables } from "../constants";
import { query, ref } from "../database/utils";
import { shortDateAndTime, shortTime } from "../../common/utils/time";
import { sym } from "../services";
import { version } from "../../common/version";


export interface StartBotInstanceArgs {
    id: string;
    testArgs?: BacktestRequest;
    noSave?: boolean;
}

/**
 * Handles plans (strategies) and bots.
 */
export class StrategyService {

    /**
     * Returns the default workspace for a given user and requester.
     * @param requestingUserId 
     * @param userId 
     * @param trx 
     * @returns 
     */
    async getDefaultWorkspaceForUser(requestingUserId: string, userId: string, trx: Knex.Transaction = null) {
        if (requestingUserId !== userId) {
            throw new Error(`Unknown user`)
        }
        const workspace = await query("temp.get-default-workspace", async db => {
            const [row] = <Workspace[]>await db(tables.Workspaces)
                .where({ ownerId: requestingUserId })
                .limit(1)
                ;

            return WorkspaceEntity.fromRow(row);
        }, trx)

        return workspace;
    }

    /**
     * Adds a new bot definition to a strategy.
     * @param strategyId The strategy to add the bot definition to
     * @param botDefProps Properties for the new bot definition
     */
    async addNewBotDefinition(strategyId: string, botDefProps: Partial<BotDefinition>, trx: Knex.Transaction = null) {
        const newBotDefinition = await query(queries.BOTS_DEFS_CREATE, async db => {
            const [row] = <BotDefinition[]>await db(tables.BotDefinitions)
                .insert(botDefProps)
                .returning("*")
                ;

            return BotDefinitionEntity.fromRow(row);
        }, trx);

        return newBotDefinition;
    }

    /**
     * Retrieves bots for a given workspace and strategy.
     * @param workspaceId 
     * @param strategyId 
     * @param trx 
     * @returns 
     */
    async getBots(workspaceId: string, strategyId: string, trx: Knex.Transaction = null): Promise<BotInstanceDescriptor[]> {
        const bots = await query(queries.BOTS_LIST, async db => {
            const rows2 = <Partial<BotDefinition & BotInstance & BotRun>[]>
                await db(`${tables.BotDefinitions} as def`)
                    .innerJoin(`${tables.BotInstances} as instance`, "instance.definitionId", "=", "def.id")
                    .leftJoin(`${tables.BotRuns} as run`, "run.instanceId", "=", "instance.id")
                    //.where("run.active", "=", true)
                    .select(`def.id as def_id`)
                    .select(`def.name as def_name`)
                    .select(`instance.id as instance_id`)
                    .select(`instance.name as instance_name`)
                    .select(`instance.symbols as instance_symbols`)
                    .select(`instance.resId as instance_resId`)
                    .select(`instance.modeId as instance_modeId`)
                    .select(`instance.runState as instance_runState`)
                    .select(`run.id as run_id`)
                    .select(`run.created as run_created`)
                    .select(`run.updated as run_updated`)
                    .select(`run.active as run_active`)
                    .orderBy(`run.updated`)
                ;

            const bindings = {
                workspaceId,
                strategyId,
            };

            const query = db.raw(
                `
                SELECT
                DISTINCT ON (bot_instances)
                    ${ref(tables.BotDefinitions, "id")} as def_id,
                    ${ref(tables.BotDefinitions, "name")} as def_name,

                    ${ref(tables.BotInstances, "id")} as "instance_id",
                    ${ref(tables.BotInstances, "\"definitionId\"")} as "instance_definitionId",
                    ${ref(tables.BotInstances, "name")} as "instance_name",
                    ${ref(tables.BotInstances, "symbols")} as "instance_symbols",
                    ${ref(tables.BotInstances, "\"modeId\"")} as "instance_modeId",
                    ${ref(tables.BotInstances, "\"resId\"")} as "instance_resId",
                    ${ref(tables.BotInstances, "\"runState\"")} as "instance_runState",

                    runs.id as run_id,
                    runs.created as run_created,
                    runs.updated as run_updated,
                    runs.active as run_active
                    
                FROM ${tables.BotDefinitions}
                INNER JOIN ${tables.Workspaces} ON ${tables.BotDefinitions}."workspaceId" = :workspaceId
                INNER JOIN ${tables.Strategies} ON ${tables.Strategies}."workspaceId" = ${tables.Workspaces}.id
                INNER JOIN ${tables.BotInstances} ON bot_instances."definitionId" = ${ref(tables.BotDefinitions)}
                LEFt JOIN LATERAL
                (
                    SELECT *
                    FROM bot_runs AS br
                    WHERE "instanceId" = bot_instances.id
                    ORDER BY updated DESC
                    LIMIT 1
                ) AS runs on TRUE
                `, bindings
            );

            const { rows } = await query;

            return rows.map(row => {
                const res: BotInstanceDescriptor = {
                    def: null,
                    instance: null,
                    run: null,
                    order: null,
                };

                res.def = BotDefinitionEntity.fromRow(row, "def_");
                res.instance = BotInstanceEntity.fromRow(row, "instance_");
                res.run = BotRunEntity.fromRow(row, "run_");

                return res;
            });
        }, trx);

        return bots;
    }

    /**
     * Retrieves a bot definition by ID.
     * @param workspaceId
     * @param botDefName
     */
    async getBotDefinitionById(workspaceId: string, id: string, trx: Knex.Transaction = null): Promise<BotDefinition> {
        return query(constants.queries.BOTS_DEFS_GET_BY_NAME, async db => {

            // TODO: SECURITY: JOIN, requesterId.
            const [row] = <BotDefinition[]>await db(tables.BotDefinitions)
                .where({ id })
                .limit(1);

            if (!row) {
                return null;
            }
            else {
                return BotDefinitionEntity.fromRow(row);
            }
        }, trx);
    }

    /**
     * Retrieves a bot definition by name.
     * @param workspaceId
     * @param botDefName
     */
    async getBotDefinitionByName(workspaceId: string, botDefName: string, trx: Knex.Transaction = null): Promise<BotDefinition> {
        return query(constants.queries.BOTS_DEFS_GET_BY_NAME, async db => {
            const [row] = <BotDefinition[]>await db(tables.BotDefinitions)
                .where({
                    workspaceId,
                    name: botDefName,
                })
                .limit(1);

            if (!row) {
                return null;
            }
            else {
                return BotDefinitionEntity.fromRow(row);
            }
        }, trx);
    }

    /**
     * Returns the default strategy for a workspace, if it exists, or creates and
     * returns a new default strategy.
     * @param workspaceId
     * @param ownerId
     * @param trx
     */
    async getOrCreateDefaultStrategy(workspaceId: string, ownerId: string, trx: Knex.Transaction = null): Promise<Strategy> {
        const newTransaction = !trx;
        trx = trx || await db.transaction() as any as Knex.Transaction;

        try {
            const existing = await query(queries.STRATEGIES_GET_OR_CREATE_DEFAULT, async db => {
                const [row] = <Strategy[]>await db(tables.Strategies)
                    .where({
                        workspaceId,
                        ownerId,
                        name: constants.DEFAULT_STRATEGY_NAME,
                    })
                    .limit(1)
                    ;

                if (row) {
                    return StrategyEntity.fromRow(row);
                }
                else {
                    const defaultStrategyProps = Object.assign({}, constants.DEFAULT_STRATEGY, <Partial<Strategy>>{
                        workspaceId,
                        ownerId,
                    });
                    const [defaultStrategyRow] = await db(tables.Strategies)
                        .insert(defaultStrategyProps)
                        .returning("*");

                    const newDefaultStrategy = StrategyEntity.fromRow(defaultStrategyRow);
                    return newDefaultStrategy;

                }
            }, trx);

            if (newTransaction) {
                await trx.commit();
            }
            return existing;
        }
        catch (err) {
            await trx.rollback();
            throw err;
        }

    }

    /**
     * Returns all active or unitialized bots for a given symbol pair.
     * An active strategy is a bots not in the stopped or paused modes.
     * @param symbolFilter
     * @param runState
     * @param trx
     */
    async getRunningBotsForFilter(symbolFilter: string, runState: RunState = RunState.ACTIVE, trx: Knex.Transaction = null): Promise<BotInstance[]> {
        const bots = await query(queries.BOTS_INSTANCES_ACTIVE_LIST_ALL, async db => {
            const bindings = {
                symbolFilter: symbolFilter.trim(),
            };

            // TODO: TEST
            const rows = <BotInstance[]>await db(tables.BotInstances)
                .where(function () {
                    return this
                        .where(<Partial<BotInstance>>{
                            modeId: Mode.LIVE
                        })
                        .orWhere(<Partial<BotInstance>>{
                            modeId: Mode.LIVE_TEST,
                        })
                        .orWhere(<Partial<BotInstance>>{
                            modeId: Mode.FORWARD_TEST,
                        })
                })
                .andWhere(function () {
                    return this.where(<Partial<BotInstance>>{
                        symbols: symbolFilter,
                        runState: RunState.NEW,
                    }).orWhere(<Partial<BotInstance>>{
                        symbols: symbolFilter,
                        runState: RunState.ACTIVE,
                    })
                });


            return rows.map(row => BotInstanceEntity.fromRow(row));
        }, trx);

        return bots;
    }


    /**
     * Returns all bots needed initialization.
     * An active strategy is a bots not in the stopped or paused modes.
     * @param symbolFilter
     * @param runState
     * @param trx
     */
    async getBotsToInitialize(symbolFilter: string, runState: RunState = RunState.ACTIVE, trx: Knex.Transaction = null): Promise<BotInstance[]> {
        const bots = await query(queries.BOTS_INSTANCES_TO_INIT, async db => {
            const bindings = {
                symbolFilter: symbolFilter.trim(),
            };

            // For now, we just match verbatim on the symbol filter
            const rows = <BotInstance[]>await db(tables.BotInstances)
                .where(<Partial<BotInstance>>{
                    runState: RunState.INITIALIZING,
                    symbols: symbolFilter, // TODO: Symbolfilter query implementation (stored proc)
                });

            return rows.map(row => BotInstanceEntity.fromRow(row));
        }, trx);

        return bots;
    }

    /**
     * Starts a bot by setting its runState appropriately.
     * 
     * @param botInstanceId 
     */
    async startBot(botInstanceId: string): Promise<void> {

        // Assume new
        const startPausedBotRows = <BotInstance[]>await db(tables.BotInstances)
            .where({ id: botInstanceId, runState: RunState.NEW })
            .update({ runState: RunState.INITIALIZING })
            .count()
            ;

        // If no update, unpause existing
        if (startPausedBotRows.length < 1) {
            const updateNewBotRows = <BotInstance[]>await db(tables.BotInstances)
                .where({ id: botInstanceId, runState: RunState.PAUSED })
                .update({ runState: RunState.ACTIVE })
                .count()
                ;
        }

        // ... if new, mark as needs-init
        // ... if paused, resume run
        // ... if stopped, start new run
        // ... if running, continue
    }

    /**
     * Pauses a bot by setting its runState appropriately.
     * 
     * @param botInstanceId 
     */
    async pauseBot(botInstanceId: string): Promise<void> {
        const startPausedBotRows = <BotInstance[]>await db(tables.BotInstances)
            .where({ id: botInstanceId })
            .update({ runState: RunState.PAUSED })
            .count()
            ;

        // ... NOTE: As with stopped state, can still receive order updates events.
    }



    /**
     * Returns the bot that produced a particular order.
     * @param orderId 
     */
    async getBotForOrder(orderId: string, trx: Knex.Transaction = null): Promise<BotInstanceDescriptor> {
        const res: BotInstanceDescriptor = {
            def: null,
            instance: null,
            run: null,
            order: null,
        };

        function prefixed(table: string, prefix: string, cols: string[]) {
            let str = "";
            for (let i = 0; i < cols.length; ++i) {
                const c = cols[i];
                str += `${table}."${c}" as "${prefix}_${c}"`;
                if (i < cols.length - 1) {
                    str += ", ";
                }
            }

            return str;
        }

        const commonCols = ["id", "created", "updated", "displayName"];

        await query(queries.BOTS_GET_BOT_FOR_ORDER, async db => {
            const query = db(tables.BotDefinitions)
                .innerJoin(tables.BotInstances, ref(tables.BotInstances, "definitionId"), ref(tables.BotDefinitions))
                .leftJoin(tables.BotRuns, ref(tables.BotRuns, "instanceId"), ref(tables.BotInstances))
                .innerJoin(tables.Orders, ref(tables.Orders, "botRunId"), ref(tables.BotRuns))
                .where(ref(tables.Orders), "=", orderId)
                .select(db.raw(prefixed(tables.BotDefinitions, "def", BotDefinitionEntity.cols)))
                .select(db.raw(prefixed(tables.BotInstances, "instance", BotInstanceEntity.cols)))
                .select(db.raw(prefixed(tables.BotRuns, "run", BotRunEntity.cols)))
                .select(db.raw(prefixed(tables.Orders, "order", OrderEntity.cols)))
                .limit(1)
                ;

            const [row] = <any>await query;
            res.def = BotDefinitionEntity.fromRow(row, "def_");
            res.instance = BotInstanceEntity.fromRow(row, "instance_");
            res.run = BotRunEntity.fromRow(row, "run_")
            res.order = OrderEntity.fromRow(row, "order_");
            return res;
        }, trx);

        return res;
    }

    /**
     * Pauses a bot instance.
     * @param instanceId 
     */
    async pauseBotInstance(instanceId: string, trx: Knex.Transaction = null): Promise<BotInstance> {
        const pauseBotProps: Partial<BotInstance> = {
            runState: RunState.PAUSED,
        };

        const updatedBotInstance = query(queries.BOTS_INSTANCES_PAUSE, async db => {
            const [row] = <BotInstance[]>await db(tables.BotInstances)
                .update(pauseBotProps)
                .where({ id: instanceId })
                .returning("*")
                ;

            return BotInstanceEntity.fromRow(row);
        }, trx);

        return updatedBotInstance;
    }

    /**
     * Updates a bot instance in the DB by ID.
     * @param instance 
     */
    async updateBotInstance(instance: Partial<BotInstance>, trx: Knex.Transaction = null): Promise<BotInstance> {
        const { id } = instance;
        if (!id) {
            throw new Error(`Must supply a bot instance ID to update it`);
        }
        const [updatedBotInstance] = <BotInstance[]>await query(queries.BOTS_INSTANCES_UPDATE, async db => {
            return db(tables.BotInstances)
                .update(instance)
                .where({ id })
                .returning("*")
                ;
        }, trx);

        return updatedBotInstance;
    }

    /**
     * Forks a bot instance, creating a new instance linked to the original
     * definition, and the instance it was forked from.
     * @param instanceId 
     * @param newProps 
     * @returns 
     */
    async forkBotInstance(instanceId: string, newProps: string, trx: Knex.Transaction = null): Promise<BotInstance> {
        return query(queries.BOTS_INSTANCES_FORK, async db => null, trx);
    }

    /**
     * Gets a bot instance from the DB by unique ID.
     * @param instanceId 
     * @param trx 
     * @returns 
     */
    async getBotInstanceById<TState = unknown>(instanceId: string, trx: Knex.Transaction = null): Promise<BotInstance<TState>> {
        const bot = await query(queries.BOTS_INSTANCES_GET, async db => {
            const [row] = <BotInstance<TState>[]>await db(tables.BotInstances)
                .where({ id: instanceId })
                .select("*")
                ;

            return BotInstanceEntity.fromRow<TState>(row);
        }, trx);

        return bot;
    }

    /**
     * Gets a bot by its name (scoped to workspace).
     * @param name 
     * @param trx 
     * @returns 
     */
    async getBotInstanceByName<TState = unknown>(workspaceId: string, name: string, trx: Knex.Transaction = null): Promise<BotInstance<TState>> {
        const bot = await query(queries.BOTS_INSTANCES_GET, async db => {
            const [row] = <BotInstance<TState>[]>await db(tables.BotInstances)
                .innerJoin(tables.BotDefinitions, ref(tables.BotInstances, "definitionId"), "=", ref(tables.BotDefinitions, "id"))
                .innerJoin(tables.Workspaces, ref(tables.BotDefinitions, "workspaceId"), "=", ref(tables.Workspaces, "id"))
                .where(ref(tables.BotInstances, "name"), "=", name)
                .limit(1)
                .select(ref(tables.BotInstances, "*"))
                ;

            if (!row) {
                throw new PrimoUnknownName(`Could not find bot instance '${name}' in workspace ${workspaceId}`);
            }

            return BotInstanceEntity.fromRow<TState>(row);
        }, trx);

        return bot;
    }

    /**
     * Starts running a plan and any of its bots.
     * Will resume a paused or stopped plan.
     * Does nothing if the strategy is already running.
     * @param planId 
     */
    async startStrategy(planId: string): Promise<void> {
        // ... start all bots in strategy
    }

    /**
     * Pauses a plan and pauses all running bots.
     * @param planId
     */
    async pauseStrategy(planId: string): Promise<void> {
        // ... pause all bots in strategy
    }

    /**
     * Gets the latest BotRun for a particular instance
     * @param instanceId 
     * @param trx 
     */
    async getLatestRunForInstance(instanceId: string, trx: Knex.Transaction = null) {
        const newTransaction = !trx;
        trx = trx || await db.transaction();
        try {
            const latestRun = await query(queries.BOTS_RUNS_LATEST_GET, async db => {
                const [row] = <BotRun[]>await db(tables.BotRuns)
                    .where(<Partial<BotRun>>{ instanceId })
                    .orderBy("updated", "desc")
                    .limit(1)
                    .returning("*")
                    ;

                if (!row) {
                    return null;
                }
                else {
                    return BotRunEntity.fromRow(row);
                }
            }, trx);

            if (newTransaction) {
                await trx.commit();
            }

            return latestRun;
        }
        catch (err) {
            trx.rollback();
            throw err;
        }
    }

    /**
     * Gets all runs for a particular bot, in ascending chronological order.
     * @param instanceId 
     * @param trx 
     */
    async getRunsForBot(instanceId: string, trx: Knex.Transaction = null) {
        const runs = await query(queries.BOTS_RUNS_LIST, async db => {
            const rows = <BotRun[]>await db(tables.BotRuns)
                .where(<Partial<BotRun>>{ instanceId })
                .orderBy("updated", "asc")
                .returning("*")
                ;

            return rows.map(row => BotRunEntity.fromRow(row));
        }, trx);

        return runs;
    }

    /**
    * Starts a new bot instance.
    * @param args
    * @param trx
    */
    async startBotInstance(args: StartBotInstanceArgs, trx: Knex.Transaction = null): Promise<[BotInstance, BotRun]> {
        const newTransaction = !trx;
        trx = trx || await db.transaction();

        const { id: instanceId, noSave } = args;
        const save = !noSave;
        try {
            let instance = await this.getBotInstanceById(instanceId, trx);
            if (instance.runState === RunState.ACTIVE) {
                throw new Error(`Bot ${instanceId} already active`);
            }

            const prevRunState = instance.runState;
            const nextRunState = instance.runState === RunState.NEW ? RunState.INITIALIZING : RunState.ACTIVE;
            const updatedProps: Partial<BotInstance> = {
                runState: nextRunState,
            };

            if (nextRunState !== prevRunState) {
                const updatedInstanceStateProps: Partial<BotInstance> = {
                    id: instance.id,
                    runState: nextRunState,
                };

                if (save) {
                    instance = await this.updateBotInstance(updatedInstanceStateProps, trx);
                }
            }

            const now = new Date();
            const newRunProps: Partial<BotRun> = {
                displayName: `Start '${instanceId}' @ ${shortDateAndTime(now)}`,
                instanceId: instance.id,
                active: true,
            };

            // New/initializing? Create a new bot run
            if (prevRunState === RunState.NEW || prevRunState === RunState.INITIALIZING || prevRunState === RunState.STOPPED) {
                if (noSave) {
                    return [instance, BotRunEntity.fromRow(newRunProps)];
                }

                const newRun = await query(queries.BOTS_RUNS_START, async db => {
                    const [row] = <BotRun[]>await db(tables.BotRuns)
                        .insert(newRunProps)
                        .returning("*")
                        ;

                    return BotRunEntity.fromRow(row);
                }, trx);

                if (newTransaction) {
                    await trx.commit();
                }

                return [instance, newRun];
            }
            else if (prevRunState === RunState.PAUSED) {
                if (noSave) {
                    debugger;
                    throw new Error(`Nosave not supported yet`);
                    const latestRun = null;
                    return [instance, latestRun];
                }
                // ... handle unpause by starting the latest run

                // TODO: Dedupe from below
                const latestRun = await this.getLatestRunForInstance(instanceId, trx);
                return [instance, latestRun];
            }
            else {
                if (noSave) {
                    throw new Error(`Nosave not supported yet`);
                    const latestRun = null;
                    return [instance, latestRun];
                }

                // Just fetch the latest run
                const savedInstance = await this.updateBotInstance(updatedProps, trx);
                const latestRun = await query(queries.BOTS_RUNS_LATEST_GET, async db => {
                    const [row] = <BotRun[]>await db(tables.BotRuns)
                        .where(<Partial<BotRun>>{ instanceId })
                        .orderBy("updated", "desc")
                        .limit(1)
                        .returning("*")
                        ;

                    return BotRunEntity.fromRow(row);
                }, trx);

                if (newTransaction) {
                    await trx.commit();
                }

                return [savedInstance, latestRun];
            }
        }
        catch (err) {
            await trx.rollback();
            throw err;
        }
    }

    /**
     * Stops a bot and any active bot run.
     * @param instanceId 
     * @param error
     */
    async stopBotInstance(instanceId: string, error: Error = null, trx: Knex.Transaction = null): Promise<[BotInstance, BotRun]> {
        const newTransaction = !trx;
        trx = trx || await db.transaction();

        try {
            let instance = await this.getBotInstanceById(instanceId, trx);
            const prevRunState = instance.runState;
            const nextRunState = error ? RunState.ERROR : RunState.STOPPED
            const updatedProps: Partial<BotInstance> = {
                runState: nextRunState,
            };

            if (nextRunState !== prevRunState) {
                const updatedInstanceStateProps: Partial<BotInstance> = {
                    id: instance.id,
                    runState: nextRunState,
                };

                instance = await this.updateBotInstance(updatedInstanceStateProps, trx);
            }

            // Stop latest run
            const run = await query(queries.BOTS_INSTANCES_STOP, async db => {
                const [row] = <BotRun[]>await db(tables.BotRuns)
                    .where(ref(tables.BotRuns, "instanceId"), "=", instanceId)
                    .andWhere(<Partial<BotRun>>{ active: true })
                    .update(<Partial<BotRun>>{ active: false })
                    .returning("*")
                    ;

                if (!row) {
                    return null;
                }
                else {
                    return BotRunEntity.fromRow(row);
                }
            }, trx);

            const now = new Date();
            const newRunProps: Partial<BotRun> = {
                displayName: `Start '${instanceId}' @ ${shortDateAndTime(now)}`,
                instanceId: instance.id,
            };

            if (newTransaction) {
                await trx.commit();
            }

            return [instance, run]
        }
        catch (err) {
            await trx.rollback();
            throw err;
        }
    }

    /**
    * Stops a plan and stops all running bots.
    * @param planId 
    */
    async stopStrategy(planId: string) {

    }

    /**
     * Starts a new bot instance from a definition.
     * @param def 
     * @param name
     * @param allocationId
     * @param start
     * @param trx
     * @returns 
     */
    async createNewInstanceFromDef(def: BotDefinition, res: TimeResolution, name: string, allocationId: string, start = false, trx: Knex.Transaction = null): Promise<BotInstance> {
        return query(queries.BOTS_INSTANCES_CREATE_FROM_DEF, async db => {
            const stateJson = {};
            const [baseSymbolId, quoteSymbolId] = sym.parseSymbolPair(def.symbols);
            const newBotProps: Partial<BotInstance> = {
                allocationId,
                definitionId: def.id,
                displayName: def.displayName,
                modeId: Mode.FORWARD_TEST,
                build: version.full,
                currentGenome: def.genome,
                name,
                prevTick: null,
                runState: start ? RunState.PAUSED : RunState.NEW,
                type: "default",
                resId: res,
                symbols: def.symbols,
                stateJson,
                stateInternal: {
                    baseSymbolId,
                    quoteSymbolId,
                },
            };

            const [row] = <BotInstance[]>await db(tables.BotInstances)
                .insert(newBotProps)
                .returning("*")
                ;

            return BotInstanceEntity.fromRow(row);
        }, trx);
    }

    /**
     * Gets the current active run for a bot.
     * Returns null if there is none.
     * @param instanceId 
     * @returns 
     */
    async getCurrentRunForBot(instanceId: string): Promise<BotRun> {
        return null;
    }
}
