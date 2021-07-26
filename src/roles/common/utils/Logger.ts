export type LogExtras = unknown[];


export abstract class Logger {
    abstract log(msg: string, ...extras: LogExtras);
    abstract debug(msg: string, ...extras: LogExtras);
    abstract info(msg: string, ...extras: LogExtras);
    abstract warn(msg: string, ...extras: LogExtras);
    abstract error(msg: string, ...extras: LogExtras);
}
