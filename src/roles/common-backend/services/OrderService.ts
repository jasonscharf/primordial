import { FeeEntity } from "../../common/entities/FeeEntity";
import { FillEntity } from "../../common/entities/FillEntity";
import { OrderEntity } from "../../common/entities/OrderEntity";
import { Fee } from "../../common/models/markets/Fee";
import { Fill } from "../../common/models/markets/Fill";
import { Order } from "../../common/models/markets/Order";
import { constants } from "../includes";
import { tables } from "../constants";
import { query } from "../database/utils";


/**
 * Used for managing orders on an exchange.
 */
export class OrderService {

    /**
     * Adds an order to the database. Performs validation beforehand.
     * @param orderProps 
     */
    async addOrderToDatabase(orderProps: Partial<Order>): Promise<Order> {
        return query(constants.queries.ORDERS_CREATE, async db => {
            const [row] = <Order[]>await db(tables.Orders)
                .insert(orderProps)
                .returning("*")
                ;

            return OrderEntity.fromRow(row);
        });
    }

    /**
     * Updates an order.
     * @param orderId 
     * @param fills 
     */
    async updateOrder(orderProps: Partial<Order>): Promise<Order> {
        const { id } = orderProps;
        if (!id) {
            throw new Error(`Missing ID`);
        }
        return query(constants.queries.ORDERS_UPDATE, async db => {
            const [row] = <Order[]>await db(tables.Orders)
                .where({ id })
                .update(orderProps)
                .returning("*")
                ;

            return OrderEntity.fromRow(row);
        });
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
    async saveFeeForOrder(orderId: string, fees: Partial<Fee>): Promise<Fee> {
        if (!orderId) {
            throw new Error(`Missing order ID`);
        }
        return query(constants.queries.ORDERS_FEES_SAVE, async db => {
            const [row] = <Fee[]>await db(tables.Fees)
                .insert(fees)
                .returning("*")
                ;

            return FeeEntity.fromRow(row);
        });
    }
}
