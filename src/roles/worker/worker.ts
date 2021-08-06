import * as http from "http2";
import Koa from "koa";
import env from "../common-backend/env";
import { dbm, log } from "../common-backend/includes";


log.info("Worker startup");


// Keep the worker stub running
const keepAliveInterval = setInterval(() => { }, 1 << 30);

process.on("SIGTERM", () => {
    log.info(`Worker receives SIGTERM. Shutting down...`);
    clearInterval(keepAliveInterval);

    shutdown().then(() => {
        log.info(`Worker shutdown complete`);
    })
});

async function shutdown() {
    // TODO: Clear all intervals
}


(async function load() {
    log.info(`Worker role running migrations (if needed)...`);
    dbm.migrate()
        .then(registerHandlers)
        .then(() => {

            // Note: A health check is required for cluster health
            const healthCheck = new Koa();
            healthCheck.listen(env.PRIMO_ROLE_HEALTH_PORT);
            healthCheck.use((ctx, next) => ctx.status = http.constants.HTTP_STATUS_OK);
        });


    // Note: A health check is required for cluster health
    const healthCheck = new Koa();
    healthCheck.listen(env.PRIMO_ROLE_HEALTH_PORT);
    healthCheck.use((ctx, next) => ctx.status = http.constants.HTTP_STATUS_OK);
})();


async function registerHandlers() {
    // ...
}
