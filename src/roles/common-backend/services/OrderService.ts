import { Knex } from "knex";
import { ApiBotOrderDescriptor } from "../../common/messages/trading";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { FeeEntity } from "../../common/entities/FeeEntity";
import { Fill } from "../../common/models/markets/Fill";
import { FillEntity } from "../../common/entities/FillEntity";
import { BotMode } from "../../common/models/system/Strategy";
import { Order, OrderState } from "../../common/models/markets/Order";
import { OrderEntity } from "../../common/entities/OrderEntity";
import { PrimoFee } from "../../common/models/markets/Fee";
import { RunState } from "../../common/models/system/RunState";
import { constants } from "../includes";
import { moneytize, query, ref, refq } from "../database/utils";
import { tables } from "../constants";
import { raw } from "body-parser";
import { BotDefinitionEntity } from "../../common/entities/BotDefinitionEntity";
import { BotInstanceEntity } from "../../common/entities/BotInstanceEntity";
import { BotRunEntity } from "../../common/entities/BotRunEntity";



// TODO: Make more general
export const DEFAULT_GET_ORDERS_OPTIONS: OrderServiceGetOrderOptions = {
    limit: Math.max(),
    page: 0,
    pageSize: Math.max(),

}

export interface CommonQueryOptions {
    limit?: number;
    page?: number;
    pageSize?: number;
}
export interface OrderServiceGetOrderOptions extends CommonQueryOptions {
    includeStopped?: boolean;
    testsOnly?: boolean;
    activeOnly?: boolean;
    liveOnly?: boolean;
    orderByField?: string;
}



/**
 * Used for managing orders on an exchange.
 */
export class OrderService {

    /**
     * Fetches orders from the database for live bots or forward tests.
     * @param requestingUserId 
     * @param workspaceId 
     * @param strategyId 
     * @param options 
     */
    async getBotOrderDescriptors(requestingUserId: string, workspaceId: string, strategyId: string, options = DEFAULT_GET_ORDERS_OPTIONS, trx: Knex.Transaction = null)
        : Promise<ApiBotOrderDescriptor[]> {
        const appliedOptions = Object.assign({}, DEFAULT_GET_ORDERS_OPTIONS, options);

        return query(constants.queries.ORDERS_LIST, async db => {
            const bindings = {
                ruid: requestingUserId,
                workspaceId,
                strategyId,
            }
            const queryBase = db(tables.Workspaces)
                //.innerJoin(tables.Strategies, ref(tables.Strategies, "workspaceId"), ref(tables.Workspaces))
                .innerJoin(tables.BotDefinitions, ref(tables.BotDefinitions, "workspaceId"), ref(tables.Workspaces))
                .innerJoin(tables.BotInstances, ref(tables.BotInstances, "definitionId"), ref(tables.BotDefinitions))
                .innerJoin(tables.BotRuns, ref(tables.BotRuns, "instanceId"), ref(tables.BotInstances))
                .innerJoin(tables.Orders, ref(tables.Orders, "botRunId"), "=", ref(tables.BotRuns))
                .where(ref(tables.Workspaces), "=", workspaceId)
                .andWhere(ref(tables.Workspaces, "ownerId"), "=", requestingUserId)
                //.andWhere(ref(tables.BotDefinitions, "strategyId"), "=", strategyId)
                ;

            queryBase.select(db.raw(`
                ${refq(tables.BotDefinitions, "id")} AS def_id,
                ${refq(tables.BotDefinitions, "name")} AS def_name,
                ${refq(tables.BotDefinitions, "displayName")} AS "def_displayName",

                ${refq(tables.BotInstances, "id")} AS "bot_id",
                ${refq(tables.BotInstances, "name")} AS "bot_name",
                ${refq(tables.BotInstances, "symbols")} AS "bot_symbols",
                ${refq(tables.BotInstances, "modeId")} AS "bot_modeId",
                ${refq(tables.BotInstances, "resId")} AS "bot_resId",
                ${refq(tables.BotInstances, "typeId")} AS "bot_typeId",
                ${refq(tables.BotInstances, "displayName")} AS "bot_displayName",
                ${refq(tables.BotInstances, "runState")} AS "bot_runState",
                ${refq(tables.BotInstances, "allocationId")} AS "bot_allocationId",
                ${refq(tables.BotInstances, "currentGenome")} AS "bot_currentGenome",

                ${refq(tables.BotRuns, "id")} AS "run_id",
                ${refq(tables.BotRuns, "displayName")} AS "run_displayName",
                ${refq(tables.BotRuns, "active")} AS "run_active",
                ${refq(tables.BotRuns, "from")} AS "run_from",
                ${refq(tables.BotRuns, "to")} AS "run_to",

                ${refq(tables.Orders, "id")} AS "order_id",
                ${refq(tables.Orders, "deleted")} AS "order_deleted",
                ${refq(tables.Orders, "displayName")} AS "order_displayName",
                ${refq(tables.Orders, "baseSymbolId")} AS "order_baseSymbolId",
                ${refq(tables.Orders, "quoteSymbolId")} AS "order_quoteSymbolId",
                ${refq(tables.Orders, "opened")} AS "order_opened",
                ${refq(tables.Orders, "closed")} AS "order_closed",
                ${refq(tables.Orders, "gross")} AS "order_gross",
                ${refq(tables.Orders, "price")} AS "order_price",
                ${refq(tables.Orders, "quantity")} AS "order_quantity",
                ${refq(tables.Orders, "fees")} AS "order_fees",
                ${refq(tables.Orders, "strike")} AS "order_strike",
                ${refq(tables.Orders, "typeId")} AS "order_typeId"
            `, bindings));

            // TODO: Review logic

            if (appliedOptions.liveOnly) {
                queryBase.andWhere(ref(tables.BotInstances, "modeId"), "=", BotMode.LIVE);
                // TODO: Live test
            }

            if (appliedOptions.testsOnly) {
                queryBase.andWhere(ref(tables.BotInstances, "modeId"), "=", BotMode.FORWARD_TEST);
            }

            if (appliedOptions.activeOnly) {
                queryBase.andWhere(ref(tables.BotRuns, "active"), "=", true);
                queryBase.andWhere(ref(tables.BotInstances, "runState"), "=", RunState.ACTIVE);
            }

            // Ordering
            queryBase.orderBy(ref(tables.Orders, "updated"), "desc");

            // TODO: Pagination
            queryBase.limit(100);

            const query = queryBase;
            const result = await query;

            const descriptors = result.map(row => {
                const def: Partial<BotDefinitionEntity> = BotDefinitionEntity.fromRow(row, "def_");
                const instance: Partial<BotInstanceEntity> = BotInstanceEntity.fromRow(row, "bot_");
                const order: Partial<OrderEntity> = OrderEntity.fromRow(row, "order_");
                const run: Partial<BotRunEntity> = BotRunEntity.fromRow(row, "run_");

                return <ApiBotOrderDescriptor>{
                    def,
                    instance,
                    run,
                    order,
                };
            });

            return descriptors;
        });
    }

    /**
     * Adds an order to the database.
     * @param orderProps 
     */
    async addOrderToDatabase(orderProps: Partial<Order>, trx: Knex.Transaction = null): Promise<Order> {
        return query(constants.queries.ORDERS_CREATE, async db => {
            const [row] = <Order[]>await db(tables.Orders)
                .insert(moneytize(orderProps))
                .returning("*")
                ;

            return OrderEntity.fromRow(row);
        }, trx);
    }

    /**
     * Updates an order.
     * @param orderId 
     * @param fills 
     */
    async updateOrder(orderProps: Partial<Order>, trx: Knex.Transaction = null): Promise<Order> {
        const { id } = orderProps;
        if (!id) {
            throw new Error(`Missing ID`);
        }
        const updatedOrder = query(constants.queries.ORDERS_UPDATE, async db => {
            const [row] = <Order[]>await db(tables.Orders)
                .where({ id })
                .update(moneytize(orderProps))
                .returning("*")
                ;

            return OrderEntity.fromRow(row);
        }, trx);

        return updatedOrder;
    }

    /**
     * Saves order fills 
     * @param orderId 
     * @param fills 
     */
    async saveFillsForOrder(orderId: string, fills: Partial<Fill>[]): Promise<Fill[]> {
        if (!orderId) {
            throw new Error(`Missing order ID`);
        }
        return query(constants.queries.ORDERS_SAVE_FILLS, async db => {
            const rows = <Order[]>await db(tables.OrderFills)
                .insert(fills)
                .returning("*")
                ;

            return rows.map(FillEntity.fromRow);
        });
    }

    /**
     * Saves a fee invocation to the DB for tracking purposes.
     * @param orderId 
     * @param props 
     */
    async saveFeeForOrder(orderId: string, fees: Partial<PrimoFee>): Promise<PrimoFee> {
        if (!orderId) {
            throw new Error(`Missing order ID`);
        }
        return query(constants.queries.ORDERS_FEES_SAVE, async db => {
            const [row] = <PrimoFee[]>await db(tables.Fees)
                .insert(fees)
                .returning("*")
                ;

            return FeeEntity.fromRow(row);
        });
    }
}
