//export * from "./analytics/a";

import * as http from "http";
import Koa from "koa";
import * as ai from "applicationinsights";
import { isNullOrUndefined } from "util";
import * as env from "./env";


export const AZURE_TRAFFIC_MANAGER_AGENT = "Azure Traffic Manager Endpoint Monitor";

export async function setupAppInsightsTelemetry() {
    if (isNullOrUndefined(env.AZURE_APP_INSIGHTS_ID) || (env.AZURE_APP_INSIGHTS_ID || "").trim() === "") {
        console.warn(`Warning: Missing App Insights ID`);
    }
    else {
        ai.setup(env.AZURE_APP_INSIGHTS_ID).start();
    }
}

export function instrumentWebAppRequest(request: http.IncomingMessage, response: http.ServerResponse) {
    const client = ai.defaultClient;

    const ua = request.headers["user-agent"];
    if (ua === AZURE_TRAFFIC_MANAGER_AGENT) {
        return;
    }
    client.trackNodeHttpRequest({ request, response });
}


export type LogLevel = "trace" | "debug" | "log" | "info" | "warning" | "error";
export interface Event {
    level: LogLevel;
    tag: string;
    message: string;
}


export interface Logger<T> {
    trace(tag: string, message: string, fields: T): void;
    log(tag: string, message: string, fields: T): void;
    info(tag: string, message: string, fields: T): void;
    warn(tag: string, message: string, fields: T): void;
    error(tag: string, message: string, fields: T): void;
    metric(name: string, value: number): void;
}

export interface LogMessageFields extends Object {
    userId: string;
    sessionId: string;
}

/**
 * Logs application-level events into Azure via Application Insights.
 */
export class AppInsightsLogger implements Logger<any> {
    protected _prefix: string;
    constructor(prefix = "general") {
        this._prefix = prefix;
    }

    logEvent(level: LogLevel, tag: string, message: string, props: object) {
        if (!ai || !ai.defaultClient) {
            return;
        }

        const severity = getSeverityLevel(level);
        const properties = {
            tag,
            ...props,
        };
        const evt: ai.Contracts.TraceTelemetry = {
            severity,
            message,
            properties,
        };

        const client = ai.defaultClient;
        client.trackTrace(evt);

        const timestampStr = formatDate(new Date());
        const msg = `[${timestampStr}][${level}][${tag}] ${message}`;

        switch (level) {
            case "debug": console.debug(msg); break;
            case "info": console.info(msg); break;
            case "log": console.log(msg); break;
            case "trace": console.trace(msg); break;
            case "warning": console.warn(msg); break;
            case "error": console.error(msg); break;
            default: console.log(msg); break;
        }
    }

    trace(tag: string, message: string, fields: LogMessageFields) {
        return this.logEvent("trace", tag, message, fields);
    }
    log(tag: string, message: string, fields: LogMessageFields) {
        return this.logEvent("log", tag, message, fields);
    }
    info(tag: string, message: string, fields: LogMessageFields) {
        return this.logEvent("info", tag, message, fields);
    }
    warn(tag: string, message: string, fields: LogMessageFields) {
        return this.logEvent("warning", tag, message, fields);
    }
    error(tag: string, message: string, fields: LogMessageFields) {
        return this.logEvent("error", tag, message, fields);
    }
    metric(name: string, value: number) {
        const client = ai.defaultClient;
        client.trackMetric({ name, value });
    }
}

/**
 * Formats a timestamp as YYYY/MM/DD YYYY/mm/dd hh:mm:sec.
 * @param dt 
 */
export function formatDate(dt: Date) {
    const dateString =
        dt.getUTCFullYear() + "/" +
        ("0" + (dt.getUTCMonth() + 1)).slice(-2) + "/" +
        ("0" + dt.getUTCDate()).slice(-2) + " " +
        ("0" + dt.getUTCHours()).slice(-2) + ":" +
        ("0" + dt.getUTCMinutes()).slice(-2) + ":" +
        ("0" + dt.getUTCSeconds()).slice(-2);

    return dateString;
}

export function getLogger(prefix = ""): Logger<any> {
    return new AppInsightsLogger(prefix);
}

export function getSeverityLevel(level: LogLevel): ai.Contracts.SeverityLevel {
    switch (level) {
        case "debug": return ai.Contracts.SeverityLevel.Verbose;
        case "info": return ai.Contracts.SeverityLevel.Information;
        case "log": return ai.Contracts.SeverityLevel.Verbose;
        case "trace": return ai.Contracts.SeverityLevel.Verbose;
        case "warning": return ai.Contracts.SeverityLevel.Warning;
        case "error": return ai.Contracts.SeverityLevel.Error;
        default: return ai.Contracts.SeverityLevel.Information;
    }
}
