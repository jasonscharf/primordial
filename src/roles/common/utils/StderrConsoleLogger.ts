import { Logger, LogExtras } from "./Logger";



function serializeExtras(arr) {
    if (!arr || arr.length === 0) {
        return "";
    }
    else {
        if (arr[0] instanceof Error) {
            console.error(arr[0]);
        }
        return " " + JSON.stringify(arr, null, 2);
    }
}

/**
 * Logger that uses stderr.
 */
export class StderrConsoleLogger extends Logger {
    debug(msg: string, ...extras: LogExtras[]) {
        const extraContent = serializeExtras(extras);
        const content = `[debug] ${msg}${extraContent}\n`;
        process.stderr.write(content);

    }
    log(msg: string, ...extras: LogExtras[]) {
        const extraContent = serializeExtras(extras);
        const content = `[debug] ${msg}${extraContent}\n`;
        process.stderr.write(content);
    }
    info(msg: string, ...extras: LogExtras[]) {
        const extraContent = serializeExtras(extras);
        const content = `[info] ${msg}${extraContent}\n`;
        process.stderr.write(content);
    }
    warn(msg: string, ...extras: LogExtras[]) {
        const extraContent = serializeExtras(extras);
        const content = `[WARN] ${msg}${extraContent}\n`;
        process.stderr.write(content);
    }
    error(msg: string, ...extras: LogExtras[]) {
        const extraContent = serializeExtras(extras);
        const content = `[ERROR] ${msg}${extraContent}\n`;
        process.stderr.write(content);
    }
}
