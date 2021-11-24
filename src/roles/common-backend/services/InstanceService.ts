import knex, { Knex } from "knex";
import env from "../env";
import { BacktestRequest } from "../messages/testing";
import { BigNum } from "../utils";
import { BotMode, Strategy } from "../../common/models/system/Strategy";
import { GeneticBotFsmState } from "../../common/models/bots/BotState";
import { GenotypeInstanceDescriptor } from "../../common/models/bots/GenotypeInstanceDescriptor";
import { GenotypeInstanceDescriptorEntity } from "../../common/entities/GenotypeInstanceDescriptorEntity";
import { defaults, queries, tables } from "../constants";
import { query, ref } from "../database/utils";


export interface StartBotInstanceArgs {
    id: string;
    testArgs?: BacktestRequest;
    noSave?: boolean;
}

/**
 * Handles creation, querying, and management of instances.
 */
export class InstanceService {

    // TODO: Migrate rest of relevant StrategyService bits

    /**
     * Returns bot status descriptors for any active forward tests or live bots.
     * @param workspaceId 
     * @param strategyId 
     * @param status 
     * @param trx 
     * @returns 
     */
    async getInstances(workspaceId: string, strategyId: string, status: BotMode, args = defaults.DEFAULT_API_COMMON_QUERY_ARGS, trx = null): Promise<GenotypeInstanceDescriptor[]> {
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
