import knex, { Knex } from "knex";
import env from "../env";
import { BacktestRequest } from "../messages/testing";
import { BigNum } from "../utils";
import { BotMode, Strategy } from "../../common/models/system/Strategy";
import { BotType } from "../../common/models/bots/BotType";
import { CommonQueryArgs } from "../../common/models/CommonQueryArgs";
import { GeneticBotFsmState } from "../../common/models/bots/BotState";
import { GenotypeInstanceDescriptor } from "../../common/models/bots/GenotypeInstanceDescriptor";
import { GenotypeInstanceDescriptorEntity } from "../../common/entities/GenotypeInstanceDescriptorEntity";
import { RunState } from "../../common/models/system/RunState";
import { defaults, queries, tables } from "../constants";
import { query, ref } from "../database/utils";
import { db } from "../includes";



export interface StartBotInstanceArgs {
    id: string;
    testArgs?: BacktestRequest;
    noSave?: boolean;
}

export interface QueryInstancesArgs extends CommonQueryArgs {
    ruid: string,
    workspaceId?: string;
    strategyId?: string;
    showDeleted?: boolean;
    statusFilter?: RunState;
    modeFilter?: BotMode;
    runStateFilter?: RunState;
    typeFilter?: BotType;
}

export const DEFAULT_QUERY_INSTANCE_ARGS: Partial<QueryInstancesArgs> = {
    modeFilter: BotMode.LIVE,
    runStateFilter: RunState.ACTIVE,
    typeFilter: BotType.SEED,
    showDeleted: false,
    limit: 100,
};


/**
 * Handles creation, querying, and management of running genotypes: instances.
 */
export class InstanceService {

    /**
     * Returns bot status descriptors for any active forward tests or live bots.
     * @param workspaceId 
     * @param strategyId 
     * @param status 
     * @param trx 
     * @returns 
     */
    async queryInstances(args: Partial<QueryInstancesArgs> = DEFAULT_QUERY_INSTANCE_ARGS, trx = null): Promise<GenotypeInstanceDescriptor[]> {
        const appliedArgs = Object.assign({}, DEFAULT_QUERY_INSTANCE_ARGS, args);
        let { modeFilter, typeFilter, showDeleted } = appliedArgs;

        const bindings = {
            modeFilter,
            typeFilter,
            showDeleted,
        };

        const results = await query(queries.BOTS_INSTANCES_RUNNING, async db => {
            const query = db.raw(
                `
            WITH vars AS (
                SELECT NULL AS ids
            ),
            instances AS (
                SELECT 
                    bi.id AS "id",
                    bi."name" AS "name",
                    bi."displayName" AS "displayName",
                    UPPER(bi."symbols") AS "symbols",
                    bi."created" AS "created",
                    bi."updated" AS "updated",
                    bi."modeId" AS "modeId",
                    bi."resId" AS "resId",
                    bi."currentGenome" AS "genome",
                    bi."runState" AS "runState",
                    bi."stateJson" AS "stateJson",
                    bi."stateInternal" AS "stateInternal",
                    bi."stateJson"->>'fsmState' AS "fsmState",
                    UPPER(bi."stateInternal"->>'baseSymbolId') AS "baseSymbolId",
                    UPPER(bi."stateInternal"->>'quoteSymbolId') AS "quoteSymbolId",
                    COALESCE((bi."stateJson"->>'prevPrice')::decimal, (bi."stateJson"->>'latestPrice')::decimal) AS "prevPrice",
                    (bi."stateJson"->>'latestPrice')::decimal AS "latestPrice"
                FROM bot_instances bi
                INNER JOIN bot_definitions bd ON bd.id = bi."definitionId"
                INNER JOIN workspaces ws ON ws.id = bd."workspaceId"
            
                WHERE 
                -- CASE for modeFilter
                -- CASE for list of ids

                (bi.id IS NOT NULL)
            ),
            runs AS (
                SELECT
                    br."instanceId" AS "runs_instanceId",
                    br.id AS "runs_id",
                    br.active AS "runs_active",
                    br.from AS "runs_from",
                    instances."modeId" AS "bot_modeId",

                    -- TODO: Extra logic to avoid using "NOW()" in active BT.
                    CASE
                        WHEN br.active THEN NOW()
                        ELSE br.to
                    END "runs_to",

                    CASE
                        WHEN br.active THEN GREATEST(1::float, ROUND(ABS(EXTRACT(epoch FROM (NOW() - br.from))::decimal / 3600), 2))
                        ELSE GREATEST(1::float, ROUND(ABS(EXTRACT(epoch FROM (br.to - br.from))::decimal / 3600), 2))
                    END "runs_hours",

                    CASE
                        WHEN br.active THEN GREATEST(1::float, ROUND(ABS(EXTRACT(epoch FROM (NOW() - br.from))::decimal / 86400), 2))
                        ELSE GREATEST(1::float, ROUND(ABS(EXTRACT(epoch FROM (br.to - br.from))::decimal / 86400), 2))
                    END "runs_days"

                FROM bot_runs br
                INNER JOIN instances ON br."instanceId" = instances.id
                
                -- TODO: CASE for runs
                
                ORDER BY br.created DESC


                -- TODO: Use rownum and a CASE to limit runs
                
                -- TODO: Limit to 1 run for BT
            
                -- CASE for active runs
            ),
            back_results AS (
                SELECT res.*
                FROM results res
                INNER JOIN runs ON runs.runs_id = res."botRunId"
                --ORDER BY runs.runs_to DESC
                INNER JOIN instances ON instances.id = runs."runs_instanceId"
                WHERE instances."modeId" = 'test-back'
                -- CASE 
            ),
            back_orders AS (
                SELECT
                    -- NOTE: Must match the schema of "trades" CTE
                    (arr->>'id')::uuid AS id,
                    (arr->>'botRunId')::uuid AS "botRunId",
                    (arr->>'relatedOrderId')::uuid AS "relatedOrderId",
                    (arr->>'stateId')::text AS "stateId",
                    (arr->>'typeId')::text AS "typeId",
                    (arr->>'created')::timestamptz AS created,
                    (arr->>'updated')::timestamptz AS updated,
                    (arr->>'opened')::timestamptz AS "opened",
                    (arr->>'closed')::timestamptz AS "closed",
                    (arr->>'capital')::decimal AS "capital",
                    (arr->>'price')::decimal AS "price",
                    (arr->>'gross')::decimal AS "gross",
                    (arr->>'fees')::decimal AS "fees"

                FROM
                    back_results,
                    jsonb_array_elements(back_results.results->'orders') arr

                    --jsonb_populate_recordset
                    -- HANGS
                    --results.results->'orders'
            ),
            fwd_orders AS (
                SELECT
                    o."id" AS "id",
                    o."botRunId" AS "botRunId",
                    o."relatedOrderId" AS "relatedOrderId",
                    o."stateId" AS "stateId",
                    o."typeId" AS "typeId",
                    o."created" AS "created",
                    o."updated" AS "updated",
                    o."opened" AS "opened",
                    o."closed" AS "closed",
                    o."capital" AS "capital",
                    o."price" AS "price",
                    o."gross" AS "gross",
                    o."fees" AS "fees"
            
                FROM orders o
                INNER JOIN runs ON o."botRunId" = runs.runs_id
                INNER JOIN instances ON (runs."runs_instanceId" = instances.id AND instances."modeId" != 'test-back')
            ),
            combined_orders AS (
                SELECT * FROM back_orders back
                UNION
                SELECT * FROM fwd_orders fwd
                -- Backtests
                -- TODO
                
                -- Forward/live
                --SELECT back.*, fwd.*
                --FROM runs 
                --LEFT JOIN back_orders back ON TRUE-- back."botRunId"
                --LEFT JOIN fwd_orders fwd ON fwd."botRunId" = runs."runs_id"
            ),
            trades AS (
                SELECT
                    runs."runs_instanceId" AS "runs_instanceId",
                    runs."runs_from" AS "runs_from",
                    runs."runs_to" AS "runs_to",
                    runs_hours,
                    runs_days,

                    ABS(buys.gross) AS "capital",
                    (ABS(buys.gross) * buys.fees) + (ABS(sells.gross) * sells.fees) AS "fees",
                    (sells.gross + buys.gross) AS "gross",
                    (sells.gross + buys.gross) - ((ABS(buys.gross) * buys.fees) + (ABS(sells.gross) * sells.fees)) AS "profit",

                    --
                    buys."id" AS "buys_id",
                    buys."botRunId" AS "buys_botRunId",
                    buys."relatedOrderId" AS "buys_relatedOrderId",
                    buys."stateId" AS "buys_stateId",
                    buys."typeId" AS "buys_typeId",
                    buys."created" AS "buys_created",
                    buys."updated" AS "buys_updated",
                    buys."opened" AS "buys_opened",
                    buys."closed" AS "buys_closed",
                    buys."capital" AS "buys_capital",
                    buys."price" AS "buys_price",
                    buys."gross" AS "buys_gross",
                    buys."fees" AS "buys_fees",

                    sells."id" AS "sells_id",
                    sells."botRunId" AS "sells_botRunId",
                    sells."relatedOrderId" AS "sells_relatedOrderId",
                    sells."stateId" AS "sells_stateId",
                    sells."typeId" AS "sells_typeId",
                    sells."created" AS "sells_created",
                    sells."updated" AS "sells_updated",
                    sells."opened" AS "sells_opened",
                    sells."closed" AS "sells_closed",
                    sells."capital" AS "sells_capital",
                    sells."price" AS "sells_price",
                    sells."gross" AS "sells_gross",
                    sells."fees" AS "sells_fees"
            
                FROM combined_orders buys
                --LEFT JOIN runs ON runs.runs_id = buys."botRunId"
                INNER JOIN runs ON runs.runs_id = buys."botRunId"
                INNER JOIN combined_orders sells ON (sells."relatedOrderId" = buys.id)
                WHERE
                    (buys."typeId" = 'buy.limit' AND buys."stateId" = 'closed') AND
                    (sells."typeId" = 'sell.limit' AND sells."stateId" = 'closed')
            ),
            back_trailing AS (
                SELECT 1

            ),
            -- Use stored results instead of computing on the fly
            back_totals AS (
                SELECT
                    instances.*,
                    instances.id AS "id",
                    instances."displayName" AS "displayName",
                    instances."stateJson" AS "state",
                    instances."stateJson"->>'fsmState' AS "fsmState",

                    res.from AS "from",
                    res.to AS "to",
                    (runs_to - runs_from) AS "duration",
            
                    COALESCE((res.results->>'numOrders')::int, 0) AS "numOrders",
                    COALESCE((res.results->>'totalFees')::decimal, 0) AS "totalFees",

                    -- TODO: Set these correctly in BotRunner for "summary" path (faster)
                    COALESCE((res.results->>'totalProfit')::decimal, 0) AS "totalProfit",
                    COALESCE((res.results->>'totalProfitPct')::decimal, 0) AS "totalProfitPct",

                    COALESCE((res.results->>'avgProfitPerDay')::decimal, 0) AS "avgProfitPerDay",
                    COALESCE((res.results->>'avgProfitPctPerDay')::decimal, 0) AS "avgProfitPctPerDay",

                    --COALESCE((res.results->>'capital')::decimal, 1000) AS "currentCapital",
                
                -- TODO: Fix
                    ROUND(ABS(EXTRACT(epoch FROM (runs_to - runs_from)) / 3600)) AS "durationHours",
                    ROUND(ABS(EXTRACT(epoch FROM (runs_to - runs_from)) / 86400)) AS "durationDays"
            
                FROM back_results res
            
                -- NOTE: This join has already happened
                INNER JOIN runs ON runs.runs_id = res."botRunId"
                INNER JOIN instances ON instances.id = "runs_instanceId"
            ),
            fwd_totals AS (
            
                    -- TODO: Wrap in derived table and avoid recomputing columns once tests in place
                    SELECT
                        instances.*,
                        instances.id AS "id",
                        instances."displayName" AS "displayName",
                        instances."stateJson" AS "state",
                        instances."stateJson"->>'fsmState' AS "fsmState",

                        runs_from AS "from",
                        runs_to AS "to",
                        (runs_to - runs_from) AS "duration",

                    COUNT(buys_id) + COUNT(sells_id) AS "numOrders",
            
                    COALESCE(
                        SUM(trades.gross)
                    , 0) AS "totalGross",

                    COALESCE(
                        SUM(trades.fees)
                    , 0) AS "totalFees",

                    COALESCE(
                        SUM(trades.profit)
                    , 0) AS "totalProfit",

                    COALESCE(
                        SUM(trades.capital)
                    , 0) AS "totalCapital",

                    COALESCE(
                        ROUND(
                            SUM(trades.profit) / SUM(trades.capital)
                        , 4)
                    , 0) AS "totalProfitPct",

                    COALESCE(
                        SUM(runs_hours)
                    , 0) AS "durationHours",

                    COALESCE(
                        SUM(runs_days)
                    , 0) AS "durationDays",

                    COALESCE(
                        SUM(profit / COALESCE(NULLIF(runs_days, 0), 1))
                    , 0) AS "avgProfitPerDay",
                    
                    COALESCE(
                        ROUND(
                            (SUM(trades.profit) / SUM(trades.capital)) / SUM(runs_days)::decimal
                        , 4) 
                    , 0) AS "avgProfitPctPerDay"

                    -- NOTE: Already joined
                    FROM instances
                    LEFT JOIN trades ON (instances.id = "runs_instanceId")
                    WHERE TRUE --(instances."modeId" != 'test-back')
                    GROUP BY
                        instances.id,
                        instances.name,
                        instances."displayName",
                        instances.created,
                        instances.updated,
                        instances.symbols,
                        instances."modeId",
                        instances."resId",
                        instances."runState",
                        instances."stateJson"->'fsmState',
                        instances."stateInternal"->>'baseSymbolId',
                        instances."stateInternal"->>'quoteSymbolId',
                        genome,
                        instances.created,
                        instances.updated,
                        duration,
                        instances."fsmState",
                        instances."stateJson",
                        instances."stateInternal",
                        instances."baseSymbolId",
                        instances."quoteSymbolId",
                        instances."prevPrice",
                        instances."latestPrice",
                        runs_from,
                        runs_to
            
            ),
            totals AS (

                -- This branch is the "summary" path and uses backtest report totals (fast)
                --SELECT * FROM back_totals
                --UNION
                --SELECT * FROM fwd_totals

                -- This branch is the "real" path uses actual backtest orders pulled from report JSON (slow)
                -- NOTE: You need also comment/uncomment out the line (instances."modeId" != 'test-back') above in fwd_totals
                SELECT * FROM fwd_totals
            )
            
            --SELECT * from back_totals;
            --SELECT id, name, symbols, "modeId", "runState", "numOrders" FROM totals;
            --SELECT results.results->>'orders' FROM results;
            --SELECT COUNT(*) FROM instances

            SELECT * FROM totals
            `
                , bindings);

            const { rows } = await query;
            const descriptors = rows.map(r => GenotypeInstanceDescriptorEntity.fromRow(r as GenotypeInstanceDescriptor));
            return descriptors;
        });

        return results;
    }

    /**
     * Returns bot status descriptors for any active forward tests or live bots.
     * @param workspaceId 
     * @param strategyId 
     * @param status 
     * @param trx 
     * @returns 
     */
    async queryInstancesOld(args: Partial<QueryInstancesArgs> = DEFAULT_QUERY_INSTANCE_ARGS, trx = null): Promise<GenotypeInstanceDescriptor[]> {
        const appliedArgs = Object.assign({}, DEFAULT_QUERY_INSTANCE_ARGS, args);
        let { modeFilter } = appliedArgs;

        const descriptors = await query(queries.BOTS_INSTANCES_RUNNING, async db => {
            const bindings = {
                modeFilter,
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
                    (bot_instances.updated - bot_runs.from) AS duration,
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

                    -- NOTE: The "1000" here is just a temporary hack
              
                            SUM(
                                (o2.gross - ABS(orders.gross)) - ((ABS(orders.gross) * orders.fees) + (ABS(o2.gross) * o2.fees))
                            ) / COALESCE(NULLIF(LAST(orders.capital, orders.opened), 0), 1000)
            
                     AS "totalProfitPct",

                    COALESCE(NULLIF(LAST(orders.capital, orders.opened), 0), 1000) AS "currentCapital",

                    ROUND(ABS(EXTRACT(epoch FROM (bot_instances.updated - bot_instances.created)) / 3600))::int AS "durationHours",
                    ROUND(ABS(EXTRACT(epoch FROM (bot_instances.updated - bot_instances.created)) / 86400))::int AS "durationDays"
                
                FROM bot_instances
                    JOIN bot_runs ON bot_runs."instanceId" = bot_instances.id
                    LEFT JOIN orders ON (orders."botRunId" = bot_runs.id AND orders."stateId" = 'closed' AND orders."typeId" = 'buy.limit')
                    LEFT JOIN orders o2 ON (o2."relatedOrderId" = orders.id AND o2."typeId" = 'sell.limit')

                WHERE
                    bot_instances."modeId" = :modeFilter AND
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

            const drawdownPct = (!isSelling || latestPrice.eq("0"))
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
}
