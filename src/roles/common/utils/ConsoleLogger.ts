import { Logger, LogExtras } from "./Logger";


/**
 * Simple console logger.
 */
export class ConsoleLogger extends Logger {
    debug(msg: string, ...extras: LogExtras[]) {
        if (extras && extras.length > 0) {
            console.debug(msg, ...extras);
        }
        else {
            console.debug(msg);
        }
    }
    log(msg: string, ...extras: LogExtras[]) {
        if (extras && extras.length > 0) {
            console.log(msg, ...extras);
        }
        else {
            console.log(msg);
        }
    }
    info(msg: string, ...extras: LogExtras[]) {
        if (extras && extras.length > 0) {
            console.info(msg, ...extras);
        }
        else {
            console.info(msg);
        }
    }
    warn(msg: string, ...extras: LogExtras[]) {
        if (extras && extras.length > 0) {
            console.warn(msg, ...extras);
        }
        else {
            console.warn(msg);
        }
    }
    error(msg: string, ...extras: LogExtras[]) {
        if (extras && extras.length > 0) {
            console.error(msg, ...extras);
        }
        else {
            console.error(msg);
        }
    }
}
