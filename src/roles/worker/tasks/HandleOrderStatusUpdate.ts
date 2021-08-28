import { log, strats } from "../../common-backend/includes";
import { BotDefinition } from "../../common/models/system/BotDefinition";
import { BotImplementationBase } from "../../common-backend/bots/BotImplementationBase";
import { BotInstance } from "../../common/models/system/BotInstance";
import { BotRun } from "../../common/models/system/BotRun";
import { OrderStatusUpdateMessage } from "../../common-backend/messages/trading";
import { QueueMessage } from "../../common-backend/messages/QueueMessage";
import { RunState } from "../../common/models/system/RunState";
import { botIdentifier, buildBotContext } from "../../common-backend/bots/BotContext";


/**
 * Handles a status change on an exchange order.
 * @param msg 
 */
export async function handleOrderStatusUpdate(msg: QueueMessage<OrderStatusUpdateMessage>) {
    debugger;
    const statusUpdate = msg.payload;
    const { exchangeOrder, primoOrder } = statusUpdate;

    console.debug(`Handling order update strategy '${msg.name}'`);

    // ... look up the correct bot instance for the order
    // ... set it up and run its order handler
    const stuff = await strats.getBotForOrder(primoOrder.id);

    const { def, instance: instanceRecord, run } = stuff;

    // Run the order handling for the bot
    const ctx = await buildBotContext(def as BotDefinition, instanceRecord as BotInstance, run as BotRun);


    // Initialize new bots
    if (instanceRecord.runState !== RunState.ACTIVE) {

        // Note: Might want to re-think this warning, as it seems quite normal in practice (esp. testing permutations)
        log.warn(`Received an order status update for ${botIdentifier(instanceRecord as BotInstance)} while inactive. Running lifecycle method to handle order...`);
    }

    try {

        // TODO: Factory
        const instance = new BotImplementationBase();
        const newState = await instance.handleOrderStatusChange(ctx, primoOrder);

        if (newState) {
            instanceRecord.stateJson = newState;
        }

        instanceRecord.prevTick = new Date();
        await strats.updateBotInstance(instanceRecord);
    }
    catch (err) {
        log.error(`Error initializing ${botIdentifier(instanceRecord as BotInstance)}`, err);
        instanceRecord.runState = RunState.ERROR;
        await strats.updateBotInstance(instanceRecord);
    }
}
