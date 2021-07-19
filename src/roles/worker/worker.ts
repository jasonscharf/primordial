import * as http from "http2";
import Koa from "koa";
import env from "../common-backend/env";


console.log("Worker startup. Listening for health check");


// Note: A health check is required for cluster health
const healthCheck = new Koa();
healthCheck.listen(env.PRIMO_ROLE_HEALTH_PORT);
healthCheck.use((ctx, next) => {
    console.log(`Worker health check`);
    ctx.status = http.constants.HTTP_STATUS_OK;
});


// Keep the worker stub running
setInterval(() => { }, 1 << 30);


process.on("SIGTERM", () => console.info("SIGTERM: Worker"));
