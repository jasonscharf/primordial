import { Money } from "../../common/numbers";
import { Order } from "../../common/models/markets/Order";


/**
 * Used to make orders.
 */
export interface OrderDelegateArgs {
    exchange: string;
    market: string;
    price: Money;
    limit?: Money;
    positionId?: string;
}

export type OrderDelegate = (args: OrderDelegateArgs) => Promise<Order>;
