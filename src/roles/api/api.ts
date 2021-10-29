import Koa from "koa";
import KoaBodyParser from "koa-bodyparser";
import KoaJson from "koa-json";
import KoaRouter from "koa-router";
import KoaShutdown from "koa-graceful-shutdown";
import * as http from "http2";
import * as ws from "ws";
import { isNullOrUndefined } from "util";
import env from "../common-backend/env";
import { ErrorType, PrimoDatabaseError, PrimoSerializableError } from "../common/errors/errors";
import { instrumentWebAppRequest } from "../common-backend/analytics";
import * as routes from "./routes";
import { db, dbm, log } from "../common-backend/includes";
import { Server } from "http";

let app: Koa;
let server: http.Http2Server;

async function configureAppInsights(app: Koa) {
    // Enable App Insights HTTP telemetry
    const appInsightsId = env.AZURE_APP_INSIGHTS_ID;
    if (!isNullOrUndefined(appInsightsId) && (appInsightsId || "").trim() !== "") {
        app.use((ctx, next) => {
            instrumentWebAppRequest(ctx.request.req, ctx.response.res);
        });
    }
}

async function configureBodyParsing(app: Koa) {

    // Middleware to parse POST bodies.
    const bodyParserOpts = {
        enableTypes: ["form", "json", "text"],
        multipart: true,
        formLimit: env.PRIMO_MULTIPART_FORM_UPLOAD_SIZE_LIMIT,
    };

    app.use(KoaBodyParser(bodyParserOpts));
}

async function configureCsrf(app: Koa) {
    // TODO: CSRF middleware
}

async function configureLogging(app: Koa) {
    if (env.isDev()) {
        //app.use(morgan("dev"));
    }
}

async function configureRoutes(app: Koa) {
    const router = new KoaRouter();

    // Register Auth Routes
    // TODO: auth.registerAuthRoutes(router);

    routes.RegisterRoutes(router as any);

    app.use(router.routes());
    app.use(router.allowedMethods());
}

async function configureSessions(app: Koa) {
    // SECURITY
    /*
    const MAX_SESSION_AGE = 15 * 24 * 60 * 10000;
    const koaSessionOptions: KoaSession.opts = <any>{
        key: SESSION_KEY,
        store: KoaRedis(koaRedisOptions),
        httpOnly: true,
        signed: true,
        overwrite: false,
        renew: false,
        maxAge: MAX_SESSION_AGE,
    };
    */

    // TODO: app.use(KoaSession(koaSessionOptions, app));
}

export interface ServerErrorResponse {
    primoErrorType: string;
    code: number;
    message: string;
}

/**
 * Creates the primary Koa app. See below for server entrypoint.
 */
async function createServerApp() {
    app = new Koa();
    server = http.createServer(app.callback());

    app.use(async (ctx, next) => {
        try {
            await next();
        }
        catch (err) {
            console.error(err);
            err.status = err.statusCode || err.status || 500;

            let errorJson: ServerErrorResponse;
            if (err instanceof PrimoSerializableError) {
                errorJson = {
                    primoErrorType: err.primoErrorType,
                    code: err.code,
                    message: err.message,
                };
            }

            // Wrap tsoa's validation errors
            if (err.name === "BadRequestError") {
                let tsoaErrorJson: { [key: string]: string } = {};
                try {
                    tsoaErrorJson = JSON.parse(err.message);
                }
                catch (err) {
                }
                const fields = tsoaErrorJson.fields || {};
                const fieldNames = Object.keys(fields);
                errorJson = {
                    primoErrorType: ErrorType.VALIDATION,
                    code: 400,
                    message: `Invalid or missing values: ${fieldNames.join(", ")}`,
                };
            }
            else {
                errorJson = {
                    primoErrorType: ErrorType.GENERIC,
                    code: err.status,
                    message: err.message,
                };
            }

            const errWrapperJson = {
                code: err.status,
                errors: [
                    errorJson,
                ],
            };
            ctx.body = errWrapperJson;
        }
    });

    app.use(KoaShutdown(server));

    // SECURITY: The ability to use multiple keys may allow us to revoke our own private session key
    // in the case of catastrophic key leakage. Note that Koa"s `app.keys` is an array.
    app.keys = env.SESSION_KEYS.split(",");


    // Just a debug hook.
    //if (env.isDev()) {
    //    app.use(async (ctx, next) => {
    //        console.log(`DEBUG: Req: ${ctx.url}`);
    //        await next();
    //    });
    //}

    await configureAppInsights(app);
    await configureBodyParsing(app);
    await configureCsrf(app);
    await configureLogging(app);
    await configureRoutes(app);
    await configureSessions(app);

    app.use(KoaJson());

    return app;
}


let wss: ws.Server = null;
async function createSocketServer() {
    wss = new ws.Server({ port: 8010 });
    log.info(`API socket server running on ${8010}`);

    wss.on("connection", function (ws) {
        console.log(`Socket connected`);

        ws.on("message", function (message) {
            console.log("Received from client: %s", message);
            ws.send("Server received from client: " + message);
        });
    });
}

console.log("--- API server entrypoint ---");

process.on("SIGTERM", () => {
    console.info("SIGTERM: API");
    if (wss) {
        wss.close();
    }

    if (server) {
        server.close();
    }
    process.exit();
});


log.info(`API role running migrations (if needed)...`);
dbm.migrate()
    //.then(createSocketServer)
    .then(() => {

        // Server entrypoint
        log.info("Initializing backend...");
        const app = createServerApp();
        app.then(app => {

            const port = env.PRIMO_SERVER_PORT;
            app.listen(port);
            log.info(`API HTTP server running on ${port}`);

            return app;
        });

        // Note: A health check is required for cluster health
        if (!env.isDev()) {
            const healthCheck = new Koa();
            healthCheck.listen(env.PRIMO_ROLE_HEALTH_PORT);
            healthCheck.use((ctx, next) => ctx.status = http.constants.HTTP_STATUS_OK);
        }
    });
