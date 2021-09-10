import { BotDefinition } from "../../common/models/bots/BotDefinition";
import { BotImplementation } from "../../common-backend/bots/BotImplementation";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotRun } from "../../common/models/bots/BotRun";
import { GeneticBotState } from "../bots/GeneticBot";
import { Money } from "../../common/numbers";
import { OrderState } from "../../common/models/markets/Order";
import { OrderStatusUpdateMessage } from "../../common-backend/messages/trading";
import { RunState } from "../../common/models/system/RunState";
import { botFactory } from "../bots/RobotFactory";
import { botIdentifier, buildBotContext } from "../../common-backend/bots/BotContext";
import { log, orders, strats } from "../../common-backend/includes";


/**
 * Handles a status change on an exchange order.
 * @param msg 
 */
export async function handleOrderStatusUpdate(msg: OrderStatusUpdateMessage) {
    const { exchangeOrder, primoOrder } = msg;
    let instanceRecord: BotInstance = null;
    try {
        const stuff = await strats.getBotForOrder(primoOrder.id);
        const { def, run } = stuff;
        instanceRecord = stuff.instance as BotInstance;

        // Run the order handling for the bot
        const ctx = await buildBotContext(def as BotDefinition, instanceRecord as BotInstance, run as BotRun);
        if (instanceRecord.runState !== RunState.ACTIVE) {

            // Note: Might want to re-think this warning, as it seems quite normal in practice (esp. testing permutations)
            log.warn(`Received an order status update for ${botIdentifier(instanceRecord as BotInstance)} while inactive. Running lifecycle method to handle order...`);
        }


        /* Moved into bot
        // First, update the Primo order accordingly
        const order = msg.primoOrder;
        const exo = msg.exchangeOrder;

        // If we're testing, there will be no actual exchange order
        if (!msg.exchangeOrder) {
            order.gross = order.quantity.mul(order.price);
            order.stateId = OrderState.CLOSED;
        }
        else {
            // LIVE orders!!!
            switch (exo.status) {
                case "open":
                    order.stateId = OrderState.OPEN;
                    break;

                case "canceled":
                    order.closed = new Date();
                    order.stateId = OrderState.CANCELLED;
                    break;

                case "closed":
                    debugger;
                    order.gross = Money((exo.amount * exo.cost).toString()); // TODO: VERIFY
                    order.closed = new Date();
                    order.stateId = OrderState.CLOSED;
                    break;

                default:
                    log.error(`Unknown order state '${exo.status}'`);
            }
        }

        await orders.updateOrder(order);
        */

        const { genome } = ctx;
        const botType = genome.getGene<string>("META", "IMPL").value;
        const instance = botFactory.create(botType) as BotImplementation;
        const newState = await instance.handleOrderStatusChange(ctx, msg);

        if (newState) {
            ctx.state = newState;
            instanceRecord.stateJson = newState;
        }

        instanceRecord.prevTick = new Date();
        await strats.updateBotInstance(instanceRecord);

        log.info(`New state is ${(newState as GeneticBotState).fsmState}`);
    }
    catch (err) {
        log.error(`Error handling order status update in ${botIdentifier(instanceRecord as BotInstance)}`, err);

        if (instanceRecord) {
            instanceRecord.runState = RunState.ERROR;
            await strats.updateBotInstance(instanceRecord);
        }
    }
}
