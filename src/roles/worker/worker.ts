import * as http from "http2";
import Koa from "koa";
import env from "../common-backend/env";
import { OrderStatusUpdateMessage, PriceUpdateMessage } from "../common-backend/messages/trading";
import { QueueMessage } from "../common-backend/messages/QueueMessage";
import { constants, dbm, log, mq } from "../common-backend/includes";
import { handlePriceUpdate } from "./tasks/HandlePriceUpdate";
import { handleOrderStatusUpdate } from "./tasks/HandleOrderStatusUpdate";


log.info("Worker startup");

process.on("SIGTERM", () => {
    log.info(`Worker receives SIGTERM. Shutting down...`);

    shutdown().then(() => {
        log.info(`Worker shutdown complete`);
        process.exit(0);
    })
});

async function shutdown() {
    // TODO: Clear all intervals
    
}


(async function load() {
    log.info(`Worker role running migrations (if needed)...`);
    dbm.migrate()
        .then(subscribeToQueues)
        .then(() => {

            // Note: A health check is required for cluster health
            const healthCheck = new Koa();
            healthCheck.listen(env.PRIMO_ROLE_HEALTH_PORT);
            healthCheck.use((ctx, next) => ctx.status = http.constants.HTTP_STATUS_OK);
        });
})();

/**
 * Subscribes the worker to the appropriate worker queue.
 */
export async function subscribeToQueues() {
    await mq.connect();

    log.info(`Worker listening to queue '${constants.queue.CHANNEL_WORKER_HI}'`);
    await mq.setupConsume(constants.queue.CHANNEL_WORKER_HI);

    // Price ticks
    mq.subMessage(constants.queue.CHANNEL_WORKER_HI, constants.events.EVENT_PRICE_UPDATE, (msg: QueueMessage<PriceUpdateMessage>) => {
        msg.receivedTs = Date.now();
        handlePriceUpdate(msg);
    });

    mq.subMessage(constants.queue.CHANNEL_WORKER_HI, constants.events.EVENT_ORDER_STATUS_UPDATE, (msg: QueueMessage<OrderStatusUpdateMessage>) => {
        msg.receivedTs = Date.now();
        handleOrderStatusUpdate(msg);
    });
    /*
    let subscribeToHighPriority = true;
    let subscribeToLowPriority = false;

    if (env.PRIMO_WORKER_PRIORITY_AFFINITY.toLowerCase() === "both" || env.isDev() || env.isTest()) { // TODO: Manual test
        subscribeToHighPriority = true;
        subscribeToLowPriority = true;
    }
    else {
        subscribeToHighPriority = env.PRIMO_WORKER_PRIORITY_AFFINITY.toLowerCase() === "high";
        subscribeToLowPriority = env.PRIMO_WORKER_PRIORITY_AFFINITY.toLowerCase() === "low";
    }

    if (subscribeToHighPriority) {
        log.info(`Worker listening to queue '${constants.queue.CHANNEL_WORKER_HI}'`);
        await mq.setupConsume(constants.queue.CHANNEL_WORKER_HI);

        // Handle price update
        mq.subMessage(constants.queue.CHANNEL_WORKER_HI, constants.messages.EVENT_PRICE_UPDATE, (msg: QueueMessage<PriceUpdateMessage>) => {
            console.log(`RECIEVE --- HIGH`);
            msg.receivedTs = Date.now();
            handlePriceUpdate(msg);
        });

        // Handle bot tick request
        /*
        mq.subMessage(constants.queue.CHANNEL_WORKER_HI, constants.messages.CMD_TICK_BOTS_ACTIVE, (msg: QueueMessage<PriceUpdateMessage>) => {
            console.log("RECEIVE BOT TICK REQUEST", msg);
            handleBotTick(msg);
        });
    }
    

    if (subscribeToLowPriority) {
        log.info(`Worker listening to queue '${constants.queue.CHANNEL_WORKER_LO}'`);
        await mq.setupConsume(constants.queue.CHANNEL_WORKER_LO);
        mq.subMessage(constants.queue.CHANNEL_WORKER_LO, constants.messages.EVENT_PRICE_UPDATE, (msg: QueueMessage<PriceUpdateMessage>) => {
            msg.receivedTs = Date.now();
            handlePriceUpdate(msg);
        });
    }*/

}
