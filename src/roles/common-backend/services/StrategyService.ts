import knex, { Knex } from "knex";
import env from "../env";
import { BacktestRequest } from "../messages/testing";
import { BigNum } from "../utils";
import { BotDefinition } from "../../common/models/bots/BotDefinition";
import { BotDefinitionEntity } from "../../common/entities/BotDefinitionEntity";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotInstanceDescriptor } from "../../common/models/BotInstanceDescriptor";
import { BotInstanceEntity } from "../../common/entities/BotInstanceEntity";
import { BotMode, Strategy } from "../../common/models/system/Strategy";
import { BotRun } from "../../common/models/bots/BotRun";
import { BotRunEntity } from "../../common/entities/BotRunEntity";
import { GeneticBotFsmState } from "../../common/models/bots/BotState";
import { GeneticBotState } from "../bots/GeneticBot";
import { GenotypeInstanceDescriptor } from "../../common/models/bots/GenotypeInstanceDescriptor";
import { GenotypeInstanceDescriptorEntity } from "../../common/entities/GenotypeInstanceDescriptorEntity";
import { Mutation } from "../../common/models/genetics/Mutation";
import { MutationEntity } from "../../common/entities/MutationEntity";
import { OrderEntity } from "../../common/entities/OrderEntity";
import { PrimoUnknownName, PrimoValidationError } from "../../common/errors/errors";
import { RunState } from "../../common/models/system/RunState";
import { StrategyEntity } from "../../common/entities/StrategyEntity";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { Workspace } from "../../common/models/system/Workspace";
import { WorkspaceEntity } from "../../common/entities/WorkspaceEntity";
import { botIdentifier } from "../bots/BotContext";
import { constants, db, log } from "../includes";
import { defaults, queries, tables } from "../constants";
import { query, ref } from "../database/utils";
import { shortDateAndTime, shortTime } from "../../common/utils/time";
import { sym } from "../services";
import { version } from "../../common/version";
import * as validate from "../validation";
import { BACKTEST_SORT_OPTIONS, INSTANCE_SORT_OPTIONS } from "../../common/constants";


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

    async lockBotForUpdate(id: string): Promise<[BotInstance, Knex.Transaction]> {
        const trx = await db.transaction();
        const { rows } = await trx.raw(`
                SELECT ${ref(tables.BotInstances, "*")}
                FROM ${tables.BotInstances}
                --INNER JOIN ${tables.BotRuns} ON ${tables.BotRuns}."instanceId" = ${ref(tables.BotInstances)}
                --INNER JOIN ${tables.Orders} ON ${tables.Orders}."botRunId" = ${ref(tables.BotRuns)}
                WHERE ${ref(tables.BotInstances)} = :botId
                FOR UPDATE;
            `,
            {
                botId: id,
            }
        );

        const bot = BotInstanceEntity.fromRow(rows[0]);
        return [bot, trx];
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
     * Fetches top performing backtests (by profit).
     * @param requestingUserId 
     * @param workspaceId 
     * @param strategyId 
     * @param trx 
     * @returns 
     */
    async getTopPerformingBacktests(requestingUserId: string, workspaceId: string, strategyId: string, args = defaults.DEFAULT_API_COMMON_QUERY_ARGS, trx: Knex.Transaction = null):
        Promise<GenotypeInstanceDescriptor[]> {
        const { limit, orderBy, orderDir } = args;

        const validatedOrderBy = validate.column(orderBy, "totalProfit", Object.keys(BACKTEST_SORT_OPTIONS));
        const validatedOrderDir = validate.orderDir(orderDir);

        const results = await query(queries.BOTS_BACK_TESTS_TOP, async db => {
            const bindings = {
                requestingUserId,
                workspaceId,
                validatedOrderBy,
                validatedOrderDir,
                limit,
            };

            // SECURITY: Note the injection vector in ORDER BY. It is validated, but just noting.
            const query = db.raw(
                `
                SELECT
                    bi.id AS "id",
                    bi."name" AS "name",
                    UPPER(bi."symbols") AS "symbols",
                    bi."created" AS "created",
                    bi."updated" AS "updated",
                    bi."modeId" AS "modeId",
                    bi."resId" AS "resId",
                    bi."currentGenome" AS "genome",
                    bi."runState" AS "runState",
                    
                    bi."stateJson"->>'fsmState' AS "fsmState",
                    UPPER(bi."stateInternal"->>'baseSymbolId') AS "baseSymbolId",
                    UPPER(bi."stateInternal"->>'quoteSymbolId') AS "quoteSymbolId",
                    bi."stateJson"->>'prevPrice' AS "prevPrice",
                    bi."stateJson"->>'latestPrice' AS "latestPrice",

                    (results.results->>'from')::timestamp with time zone AS "from",
                    (results.results->>'to')::timestamp with time zone AS "to",
                    ((results.results->>'to')::timestamp with time zone) - ((results.results->>'from')::timestamp with time zone) AS "duration",

                    COALESCE((results.results->>'numOrders')::int, 0) AS "numOrders",
                    COALESCE((results.results->>'totalfees')::decimal, 0) AS "totalFees",
                    COALESCE((results.results->>'totalProfit')::decimal, 0) AS "totalProfit",
                    COALESCE((results.results->>'totalProfitPct')::decimal, 0) AS "totalProfitPct",
                    COALESCE((results.results->>'avgProfitPerDay')::decimal, 0) AS "avgProfitPerDay",
                    COALESCE((results.results->>'avgProfitPctPerDay')::decimal, 0) AS "avgProfitPctPerDay"

                FROM bot_instances bi
                INNER JOIN workspaces ws ON (ws.id = :workspaceId AND ws."ownerId" = :requestingUserId)
                INNER JOIN bot_definitions bd ON (bd."workspaceId" = ws.id AND bi."definitionId" = bd.id)
                LEFT JOIN LATERAL
                (
                    SELECT *
                    FROM bot_runs AS br
                    WHERE 
                        br."instanceId" = bi.id
                    ORDER BY updated DESC
                    LIMIT 1
                ) AS run ON TRUE
                INNER JOIN results ON results."botRunId" = run.id
                WHERE
                    bi."deleted" IS FALSE
                    AND bi."modeId" = 'test-back'
                    AND bi."runState" = 'stopped'

                ORDER BY
                    "${validatedOrderBy}" ${validatedOrderDir === "ASC" ? "ASC" : "DESC"}

                LIMIT :limit
                    ;
                `
                , bindings);

            const { rows } = await query;
            return rows.map(row => GenotypeInstanceDescriptorEntity.fromRow(row));
        }, trx);

        return results;
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
            const bindings = {
                workspaceId,
                strategyId,
            };

            const query = db.raw(
                `
                SELECT
                DISTINCT ON (bot_instances)
                    ${ref(tables.BotDefinitions, "id")} AS def_id,
                    ${ref(tables.BotDefinitions, "name")} AS def_name,

                    ${ref(tables.BotInstances, "id")} AS "instance_id",
                    ${ref(tables.BotInstances, "\"definitionId\"")} AS "instance_definitionId",
                    ${ref(tables.BotInstances, "name")} AS "instance_name",
                    ${ref(tables.BotInstances, "symbols")} AS "instance_symbols",
                    ${ref(tables.BotInstances, "\"modeId\"")} AS "instance_modeId",
                    ${ref(tables.BotInstances, "\"resId\"")} AS "instance_resId",
                    ${ref(tables.BotInstances, "\"runState\"")} AS "instance_runState",

                    runs.id AS run_id,
                    runs.created AS run_created,
                    runs.updated AS run_updated,
                    runs.active AS run_active

                FROM ${tables.BotDefinitions}
                INNER JOIN ${tables.Workspaces} ON ${tables.BotDefinitions}."workspaceId" = :workspaceId
                INNER JOIN ${tables.Strategies} ON ${tables.Strategies}."workspaceId" = ${tables.Workspaces}.id
                INNER JOIN ${tables.BotInstances} ON bot_instances."definitionId" = ${ref(tables.BotDefinitions)}
                LEFT JOIN LATERAL
                (
                    SELECT *
                    FROM bot_runs AS br
                    WHERE "instanceId" = bot_instances.id
                    ORDER BY updated DESC
                    LIMIT 1
                ) AS runs ON TRUE
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
     * Returns bot status descriptors for any active forward tests or live bots.
     * @param workspaceId 
     * @param strategyId 
     * @param status 
     * @param trx 
     * @returns 
     */
    async getBotDescriptors(workspaceId: string, strategyId: string, status: BotMode, args = defaults.DEFAULT_API_COMMON_QUERY_ARGS, trx = null): Promise<GenotypeInstanceDescriptor[]> {
        const descriptors = await query(queries.BOTS_INSTANCES_RUNNING, async db => {
            const bindings = {
                status,
            };

            // TODO: Add RUID, join workspace + strategy
            const { rows } = await db.raw(
                `
                SELECT
                    bot_instances.id,
                    bot_instances.name,
                    bot_instances.symbols,
                    bot_instances."modeId",
                    bot_instances."runState",
                    bot_instances."resId",
                    bot_instances."stateJson" as "state",
                    bot_instances."stateJson"->>'fsmState' AS "fsmState",
                    bot_instances."stateInternal"->>'baseSymbolId' AS "baseSymbolId",
                    bot_instances."stateInternal"->>'quoteSymbolId' AS "quoteSymbolId",
                    bot_instances."stateJson"->>'prevPrice' AS "prevPrice",
                    bot_instances."stateJson"->>'latestPrice' AS "latestPrice",
                    bot_instances."currentGenome" as genome,
                    bot_instances.created AS created,
                    bot_instances.updated AS updated,
                    (NOW() - bot_runs.from) AS duration,
                    bot_instances."stateJson",
                    bot_runs.id AS "runId",
                    bot_runs.from AS "from",
                    bot_runs.to AS "to",

                    COUNT(orders.id)::int AS "numOrders",

                    COALESCE(
                        ROUND(SUM((ABS(orders.gross) * orders.fees) + (ABS(o2.gross) * o2.fees)), 2)
                    , 0) AS "totalFees",

                    COALESCE(
                        ROUND(
                            SUM(
                                (o2.gross - ABS(orders.gross)) - ((ABS(orders.gross) * orders.fees) + (ABS(o2.gross) * o2.fees))
                            )
                        , 4)
                    , 0) AS "totalProfit",

                    COALESCE(
                        ABS(
                            SUM(
                                (o2.gross - ABS(orders.gross)) - ((ABS(orders.gross) * orders.fees) + (ABS(o2.gross) * o2.fees))
                            )  / LAST(orders.capital, orders.opened)
                        ), 0) 
                     AS "totalProfitPct",

                    COALESCE(
                        LAST(orders.capital, orders.opened), 0
                    ) AS "currentCapital",

                    ROUND(ABS(EXTRACT(epoch FROM (bot_instances.created - bot_instances.updated)) / 3600))::int AS "durationHours",
                    ROUND(ABS(EXTRACT(epoch FROM (bot_instances.created - bot_instances.updated)) / 86400))::int AS "durationDays"
                
                FROM bot_instances
                    JOIN bot_runs ON bot_runs."instanceId" = bot_instances.id
                    LEFT JOIN orders ON (orders."botRunId" = bot_runs.id AND orders."stateId" = 'closed')
                    LEFT JOIN orders o2 ON o2."relatedOrderId" = orders.id

                WHERE
                    bot_instances."modeId" = :status AND
                    bot_instances.deleted = false AND
                    bot_runs.active = true

                GROUP BY
                    bot_instances.id,
                    bot_instances.name,
                    bot_instances.symbols,
                    bot_instances."modeId",
                    bot_instances."resId",
                    bot_instances."runState",
                    bot_instances."stateJson"->'fsmState',
                    bot_instances."stateInternal"->>'baseSymbolId',
                    bot_instances."stateInternal"->>'quoteSymbolId',
                    genome,
                    bot_instances.created,
                    bot_instances.updated,
                    duration,
                    bot_instances."stateJson",
                    bot_runs."id"

                ORDER BY
                    "totalProfitPct" DESC,
                    "runState" DESC,
                    updated DESC
                    
                `, bindings
            );
            const descriptors = rows.map(r => GenotypeInstanceDescriptorEntity.fromRow(r as GenotypeInstanceDescriptor));
            return descriptors;
        }, trx);

        // Compute drawdown
        descriptors.forEach(desc => {
            const { fsmState, state } = desc;
            const isSelling = (
                fsmState === GeneticBotFsmState.SURF_SELL ||
                fsmState === GeneticBotFsmState.WAITING_FOR_SELL_OPP ||
                fsmState === GeneticBotFsmState.WAITING_FOR_SELL_ORDER_CONF
            );

            const { latestPrice: latestPriceRaw, prevPrice: prevPriceRaw } = state || {};

            const prevPrice = BigNum(prevPriceRaw ?? "0");
            const latestPrice = BigNum(latestPriceRaw ?? "0");

            const drawdownPct = latestPrice.eq("0")
                ? 0
                : BigNum("1").minus(prevPrice.div(latestPrice)).round(2).toNumber()
                ;

            // NOTE: This logic is duplicated in ResultService::getBotDescriptors
            // TODO: Review/fix. Fees. See bug around "capital" in ADO
            desc.drawdown = desc.currentCapital.mul(drawdownPct + "");
            //desc.totalGross = desc.totalGross.add(desc.drawdown);
            desc.totalProfit = desc.totalProfit.add(desc.drawdown);

            if (desc.currentCapital.toString() === "0") {
                desc.totalProfitPct = BigNum("0");
            }
            else {
                // TODO: FIX. There's a bug in ADO for this. We are assuming uniform capital here.
                desc.totalProfitPct = (desc.totalProfit.div(desc.currentCapital).round(4).toNumber());
            }
        });

        return descriptors;
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
            const query = db(tables.BotInstances)
                .andWhere(ref(tables.BotInstances, "deleted"), false)
                .where(function () {
                    return this
                        .where(<Partial<BotInstance>>{
                            modeId: BotMode.LIVE
                        })
                        .orWhere(<Partial<BotInstance>>{
                            modeId: BotMode.LIVE_TEST,
                        })
                        .orWhere(<Partial<BotInstance>>{
                            modeId: BotMode.FORWARD_TEST,
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

            const rows = <BotInstance[]>await query;
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
        //console.log(`Updated bot instance for ${botIdentifier(instance as BotInstance)}`);
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
     * Updates a bot run in the DB by ID.
     * @param instance 
     */
    async updateBotRun(run: Partial<BotRun>, trx: Knex.Transaction = null): Promise<BotRun> {
        const { id } = run;
        if (!id) {
            throw new Error(`Must supply an ID specifying which bot to update`);
        }
        const [updatedBotRun] = <BotRun[]>await query(queries.BOT_RUNS_UPDATE, async db => {
            return db(tables.BotRuns)
                .update(run)
                .where({ id })
                .returning("*")
                ;
        }, trx);

        return updatedBotRun;
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
    async getBotInstanceById<TState = GeneticBotState>(instanceId: string, trx: Knex.Transaction = null): Promise<BotInstance<TState>> {
        const bot = await query(queries.BOTS_INSTANCES_GET, async db => {
            const [row] = <BotInstance<TState>[]>await db(tables.BotInstances)
                .select("*")
                .where({ id: instanceId })
                .limit(1)
                ;

            return BotInstanceEntity.fromRow<TState>(row);
        }, trx);

        return bot;
    }

    async getBotInstancesByIds(requestingUserId: string, workspaceId: string, strategyId: string, ids: string[], trx: Knex.Transaction = null): Promise<BotInstance[]> {
        const instances = await query(queries.BOTS_INSTANCES_GET_BY_IDS, async db => {

            const includeDeleted = false;
            const query = db(tables.BotInstances)
                .select(ref(tables.BotInstances, "*"))
                .innerJoin(tables.BotDefinitions, ref(tables.BotInstances, "definitionId"), ref(tables.BotDefinitions))
                .innerJoin(tables.Workspaces, ref(tables.BotDefinitions, "workspaceId"), ref(tables.Workspaces))
                .where(ref(tables.Workspaces), "=", workspaceId)
                .andWhere(ref(tables.Workspaces, "ownerId"), "=", requestingUserId)
                ;

            query.whereIn(ref(tables.BotInstances, "id"), ids);

            if (!includeDeleted) {
                query.andWhere(ref(tables.BotInstances, "deleted"), "=", false);
            }

            const rows = <BotInstance[]>await query;
            return rows.map(row => BotInstanceEntity.fromRow(row));
        }, trx);

        return instances;
    }

    /**
     * Gets a bot by its name (scoped to workspace).
     * @param name 
     * @param trx 
     * @returns 
     */
    async getBotInstanceByName<TState = GeneticBotState>(workspaceId: string, name: string, trx: Knex.Transaction = null): Promise<BotInstance<TState>> {
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
                from: new Date(),
                to: new Date(),
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
            const stateJson = {} as any as GeneticBotState;
            const [baseSymbolId, quoteSymbolId] = sym.parseSymbolPair(def.symbols);
            const newBotProps: Partial<BotInstance> = {
                allocationId,
                definitionId: def.id,
                displayName: def.displayName,
                modeId: BotMode.FORWARD_TEST,
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

    async createNewInstance(props: Partial<BotInstance>, trx: Knex.Transaction = null): Promise<BotInstance> {
        return query(queries.BOTS_INSTANCES_CREATE, async db => {
            const [row] = <BotInstance[]>await db(tables.BotInstances)
                .insert(props)
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
