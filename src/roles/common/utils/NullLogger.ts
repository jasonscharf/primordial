import { Logger, LogExtras } from "./Logger";


/**
 * No-op logger.
 */
export class NullLogger extends Logger {
    debug(msg: string, ...extras: LogExtras[]) { }
    log(msg: string, ...extras: LogExtras[]) { }
    info(msg: string, ...extras: LogExtras[]) { }
    warn(msg: string, ...extras: LogExtras[]) { }
    error(msg: string, ...extras: LogExtras[]) { }
}
