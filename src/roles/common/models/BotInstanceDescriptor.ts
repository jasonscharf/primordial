import { BotDefinition } from "./system/BotDefinition";
import { BotInstance } from "./system/BotInstance";
import { BotRun } from "./system/BotRun";
import { Order } from "./markets/Order";


/**
 * Describes a bot instance by grouping its definition, instance, and current run (if any).
 * Can also include an order, when fetched by an order ID.
 */
// TODO: No partial?
export interface BotInstanceDescriptor {
    def: Partial<BotDefinition>;
    instance: Partial<BotInstance>;
    run?: Partial<BotRun>;
    order?: Partial<Order>;
}
