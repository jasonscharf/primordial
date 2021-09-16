import { DateTime } from "luxon";
import { TimeResolution } from "../models/markets/TimeResolution";



/**
 * Removes milliseconds from a timestamp, flooring to the most recent completed second.
 * Ex:
 *  12:01:32:027 -> 12:01:32:000
 * @param ts 
 */
export function removeMilliseconds(ts: Date) {
    const ret = new Date(ts);
    ret.setMilliseconds(0);
    return ret;
}

/**
 * Removes seconds from a timestamp, flooring to the most recent completed minute.
 * Ex:
 *  12:01:32:000 -> 12:01:00:000
 * @param ts 
 */
export function removeSeconds(ts: Date) {
    const ret = new Date(ts);
    ret.setMilliseconds(0);
    ret.setSeconds(0);
    return ret;
}

/**
 * Removes minutes from a timestamp, flooring to the most recent completed hour.
 * Ex:
 *  12:05:12:032 -> 12:00:00:000
 * @param ts 
 */
export function removeMinutes(ts: Date) {
    const ret = new Date(ts);
    ret.setMilliseconds(0);
    ret.setSeconds(0);
    ret.setMinutes(0);
    return ret;
}

/**
 * Removes hours from a timestamp, flooring to the most recent completed day.
 * Ex:
 *  01-01-1970 05:05:12:032 -> 01-01-1970 12:00:00:000
 * @param ts 
 */
export function removeHours(ts: Date) {
    const ret = new Date(ts);
    ret.setMilliseconds(0);
    ret.setSeconds(0);
    ret.setMinutes(0);
    ret.setHours(0);
    return ret;
}

/**
 * Floors a timestamp down to the most recent even second.
 * Ex:
 *  12:00:03 -> 12:00:02
 * @param ts 
 */
export function floorToTwoSeconds(ts: Date) {
    const ret = new Date(ts);
    ret.setMilliseconds(0);
    ret.setSeconds(ts.getSeconds() % 2 ? ts.getSeconds() - 1 : ts.getSeconds());
    return ret;
}

/**
 * Floors a timestamp down to the most 5-minute mark
 * Ex:
 *  12:07:03 -> 12:05:00
 * @param ts 
 */
export function floorToMinutes(ts: Date, mins = 1) {
    const ret = new Date(ts);
    ret.setMilliseconds(0);
    ret.setSeconds(0);
    ret.setMinutes(Math.floor(ts.getMinutes() / mins) * mins);
    return ret;
}

/**
 * Removes days from a timestamp, flooring to the most recent completed month.
 * Ex:
 *  01-01-1970 05:05:12:032 -> 01-01-1970 12:00:00:000
 * @param ts 
 */
export function removeDays(ts: Date) {
    const ret = new Date(ts);
    ret.setMilliseconds(0);
    ret.setSeconds(0);
    ret.setMinutes(0);
    ret.setHours(0);
    ret.setDate(1);
    return ret;
}

/**
 * Produces a short, human-readable representation of the current time in h/m/s.
 * @param dt 
 * @returns 
 */
export function shortTime(dt: Date) {
    return `${("0" + dt.getHours()).slice(-2)}:${("0" + dt.getMinutes()).slice(-2)}:${("0" + dt.getSeconds()).slice(-2)}`;
}

/**
 * Produces a short, human-readable representation of the current date and time in YYYY-MM-DD h/m/s.
 * @param dt 
 * @returns 
 */
export function shortDateAndTime(dt: Date) {
    return `${dt.getFullYear()}-${(("0" + (dt.getMonth() + 1)).slice(-2))}-${("0" + dt.getDate()).slice(-2)}` +
        ` ${("0" + dt.getHours()).slice(-2)}:${("0" + dt.getMinutes()).slice(-2)}:${("0" + dt.getSeconds()).slice(-2)}`;
}


/**
 * Rounds a price down the nearest appropriate floor, according to the `TimeResolution` passed.
 * For example, normalizes pricing timestamps for minute-resolution prices to the nearest.
 * @param res 
 * @param ts 
 * @returns 
 */
export function normalizePriceTime(res: TimeResolution, ts: Date): Date {
    switch (res) {
        case TimeResolution.ONE_SECOND: return removeMilliseconds(ts);
        case TimeResolution.TWO_SECONDS: return floorToTwoSeconds(ts);
        case TimeResolution.ONE_MINUTE: return removeSeconds(ts);
        case TimeResolution.FIVE_MINUTES: return floorToMinutes(ts, 5);
        case TimeResolution.FIFTEEN_MINUTES: return floorToMinutes(ts, 15);
        case TimeResolution.ONE_HOUR: return removeMinutes(ts);
        case TimeResolution.ONE_DAY: return removeHours(ts);
        case TimeResolution.ONE_MONTH: return removeDays(ts);
        default:
            throw new Error(`Unknown/unsupported time resolution '${res}'`);
    }
}

/**
 * Returns the appropriate Postgres "datepart" identifier, e.g. "second" for resolution "5 seconds".
 * @param res 
 */
export function getPostgresDatePartForTimeRes(res: TimeResolution): string {
    switch (res) {
        case TimeResolution.ONE_SECOND:
        case TimeResolution.TWO_SECONDS:
            return "second";

        case TimeResolution.FIVE_MINUTES:
        case TimeResolution.FIFTEEN_MINUTES:
        case TimeResolution.ONE_MINUTE:
            return "minute";

        case TimeResolution.ONE_HOUR:
            return "hour";
        case TimeResolution.ONE_DAY:
            return "day";
        case TimeResolution.ONE_WEEK:
            return "week";
        case TimeResolution.ONE_MONTH:
            return "month";
    }
}

/**
 * Returns a TSDB compatible interval string given a time resolution.
 * @param res 
 */
export function getTimeframeForResolution(res: TimeResolution): string {
    switch (res) {
        case TimeResolution.ONE_SECOND: return "1 second";
        case TimeResolution.TWO_SECONDS: return "2 seconds";
        case TimeResolution.ONE_MINUTE: return "1 minute";
        case TimeResolution.FIVE_MINUTES: return "5 minutes";
        case TimeResolution.FIFTEEN_MINUTES: return "15 minutes";
        case TimeResolution.ONE_HOUR: return "1 hour";
        case TimeResolution.ONE_DAY: return "1 day";
        case TimeResolution.ONE_WEEK: return "1 week";
        case TimeResolution.ONE_MONTH: return "1 month";
        default:
            throw new Error(`Cannot derive interval for unknown time resolution '${res}'`);
    }
}

/**
 * Number of milliseconds in an interval in the given time resolution.
 * @param res 
 */
export function millisecondsPerResInterval(res: TimeResolution): number {
    switch (res) {
        case TimeResolution.ONE_SECOND: return 1000;
        case TimeResolution.TWO_SECONDS: return 2 * 1000;
        case TimeResolution.ONE_MINUTE: return 1 * 60 * 1000;
        case TimeResolution.FIVE_MINUTES: return 5 * 60 * 1000;
        case TimeResolution.FIFTEEN_MINUTES: return 15 * 60 * 1000;
        case TimeResolution.ONE_HOUR: return 1 * 60 * 60 * 1000;
        case TimeResolution.ONE_DAY: return 1 * 24 * 60 * 60 * 1000;

        case TimeResolution.ONE_MONTH:
        default:
            throw new Error(`This method '${millisecondsPerResInterval.name}' does not supportt time resolution '${res}'`);
    }
}

export interface DateRange {
    start: Date;
    end: Date;
}

/**
 * Splits a price data range into X sub-ranges of size Y.
 * For example, given a range spanning 1000+ minutes, breaks it into chunks of 500 to match
 * request limits.
 * @param res 
 * @param range 
 */
export function splitRanges(res: TimeResolution, range: { start: Date, end: Date }, max):
    DateRange[] {
    max = Math.min(max, 1000);
    const { start, end } = range;

    const rangeDuration = end.getTime() - start.getTime();
    const intervalMs = millisecondsPerResInterval(res);
    const numRequests = Math.ceil(rangeDuration / intervalMs / max);

    if (numRequests === 1) {
        return [Object.assign({}, range)];
    }
    else {
        const splits: { start: Date, end: Date }[] = [];
        let currTs = start.getTime();
        for (let i = 0; i < numRequests; ++i) {
            const splitStart = currTs;
            const splitEnd = (i == numRequests - 1)
                ? splitStart + (end.getTime() - splitStart)
                : splitStart + (intervalMs * max)
                ;

            const split = {
                start: new Date(splitStart),
                end: new Date(splitEnd - 1),
            };
            splits.push(split);
            currTs = splitEnd;
        }

        return splits;
    }
}

/**
 * Creates a JavaScript Date object from an ISO-8601 string.
 * @param input 
 * @returns 
 */
export function from(input: string | Date): Date {
    const fr = typeof input === "string"
        ? DateTime.fromISO(input)
        : DateTime.fromISO((input as Date).toISOString())
        ;

    if (!fr.isValid) {
        throw new Error(`Could not parse invalid test date '${input}'`);
    }

    return fr.toJSDate();
}

/**
 * Converts milliseconds to something more human friendly.
 * @param ms
 * @returns 
 */
export function human(ms: number) {
    const seconds = (ms / 1000);
    const minutes = (ms / (1000 * 60));
    const hours = (ms / (1000 * 60 * 60));
    const days = (ms / (1000 * 60 * 60 * 24));
    if (seconds < 60) return seconds.toFixed(1) + " seconds";
    else if (minutes < 60) return minutes.toFixed(1) + " minutes";
    else if (hours < 24) return hours.toFixed(1) + " hours";
    else return Math.ceil(days) + " days";
}
