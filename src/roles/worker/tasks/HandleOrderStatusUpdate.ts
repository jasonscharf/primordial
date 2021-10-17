import { BotDefinition } from "../../common/models/bots/BotDefinition";
import { BotImplementation } from "../../common-backend/bots/BotImplementation";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotRun } from "../../common/models/bots/BotRun";
import { OrderStatusUpdateMessage } from "../../common-backend/messages/trading";
import { RunState } from "../../common/models/system/RunState";
import { botFactory } from "../../common-backend/bots/RobotFactory";
import { botIdentifier, buildBotContext } from "../../common-backend/bots/BotContext";
import { log, orders, strats, tables } from "../../common-backend/includes";
import { query, ref } from "../../common-backend/database/utils";


/**
 * Handles a status change on an exchange order.
 * @param msg 
 */
export async function handleOrderStatusUpdate(msg: OrderStatusUpdateMessage) {
    const { exchangeOrder, instanceId, primoOrder } = msg;
    let instanceRecord: BotInstance = null;

    let [bot, trx] = await strats.lockBotForUpdate(instanceId);
    try {
        const botMetadata = await strats.getBotForOrder(primoOrder.id, trx);
        const { def, run } = botMetadata;
        instanceRecord = botMetadata.instance as BotInstance;
        
        console.log("");
        console.log("");
        console.log("");
        console.log(`-- START HANDLE ORDER STATUS for ${botIdentifier(instanceRecord)} --- State: ${instanceRecord.stateJson.fsmState}`);
        trx// = await strats.lockBotForUpdate(instanceRecord.id);

        // Run the order handling for the bot
        const ctx = await buildBotContext(def as BotDefinition, instanceRecord as BotInstance, run as BotRun);
        ctx.trx = trx;

        if (instanceRecord.runState !== RunState.ACTIVE) {

            // Note: Might want to re-think this warning, as it seems quite normal in practice (esp. testing permutations)
            log.warn(`Received an order status update for ${botIdentifier(instanceRecord as BotInstance)} while inactive. Running lifecycle method to handle order anyways...`);
        }

        const { genome } = ctx;
        const botType = genome.getGene<string>("META", "IMPL").value;
        const instance = botFactory.create(botType) as BotImplementation;

        console.log(`handleOrderStatusChange PRE: ${botIdentifier(instanceRecord)} :: ${(instanceRecord.stateJson as any).fsmState}`);

        const newState = await instance.handleOrderStatusChange(ctx, msg, trx);
        console.log(`handleOrderStatusUpdate POST1: ${botIdentifier(instanceRecord)} :: ${(instanceRecord.stateJson as any).fsmState}`);
        if (newState) {
            ctx.state = newState;
            instanceRecord.stateJson = newState;
        }

        instanceRecord.prevTick = new Date();
        await strats.updateBotInstance(instanceRecord, trx);
        await trx.commit();

        console.log(`handleOrderStatusUpdate POST2: ${botIdentifier(instanceRecord)} :: Saved status is ${(instanceRecord.stateJson as any).fsmState}`);
        console.log(`-- END HANDLE ORDER STATUS for ${botIdentifier(instanceRecord)} :: ${instanceRecord.stateJson.fsmState}`);
        console.log("");
        console.log("");
        console.log("");
    }
    catch (err) {
        if (trx) {
            await trx.rollback();
        }

        log.error(`Error handling order status update in ${botIdentifier(instanceRecord as BotInstance)}`, err);

        if (instanceRecord) {
            instanceRecord.runState = RunState.ERROR;
            await strats.updateBotInstance(instanceRecord);
        }
    }
}
