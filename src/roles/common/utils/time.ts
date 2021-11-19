import { DateTime } from "luxon";
import { TimeResolution } from "../models/markets/TimeResolution";
import { isNullOrUndefined } from "../utils";
import { DEFAULT_PRESENT_DURATION_ARGS } from "./presentation";



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
 * Floors a timestamp down to the nearest minute mark
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
 * Floors a timestamp down to the nearest hour mark
 * Ex:
 *  12:07:03 -> 12:05:00
 * @param ts 
 */
export function floorToHours(ts: Date, hours = 1) {
    const ret = new Date(ts);
    ret.setMilliseconds(0);
    ret.setSeconds(0);
    ret.setMinutes(0);
    ret.setHours(Math.floor(ts.getHours() / hours) * hours);
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
    if (!dt) {
        return "-";
    }
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
        case TimeResolution.ONE_HOUR: return floorToHours(ts, 1);
        case TimeResolution.TWO_HOURS: return floorToHours(ts, 2);
        case TimeResolution.SIX_HOURS: return floorToHours(ts, 6);
        case TimeResolution.FOUR_HOURS: return floorToHours(ts, 4);
        case TimeResolution.TWELVE_HOURS: return floorToHours(ts, 12);
        case TimeResolution.ONE_DAY: return removeHours(ts);

        // See note on TimeResolution re: TSOA codegen
        //case TimeResolution.ONE_MONTH: return removeDays(ts);
        case "1M" as TimeResolution: return removeDays(ts);
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
        case TimeResolution.TWO_HOURS:
        case TimeResolution.FOUR_HOURS:
        case TimeResolution.SIX_HOURS:
        case TimeResolution.TWELVE_HOURS:
            return "hour";

        case TimeResolution.ONE_DAY:
            return "day";

        case TimeResolution.ONE_WEEK:
            return "week";

        //case TimeResolution.ONE_MONTH:
        //    return "month";
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
        case TimeResolution.TWO_HOURS: return "2 hours";
        case TimeResolution.FOUR_HOURS: return "4 hours";
        case TimeResolution.SIX_HOURS: return "6 hours";
        case TimeResolution.TWELVE_HOURS: return "12 hours";
        case TimeResolution.ONE_DAY: return "1 day";
        case TimeResolution.ONE_WEEK: return "1 week";
        //case TimeResolution.ONE_MONTH: return "1 month";
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
        case TimeResolution.TWO_HOURS: return 2 * 60 * 60 * 1000;
        case TimeResolution.FOUR_HOURS: return 4 * 60 * 60 * 1000;
        case TimeResolution.SIX_HOURS: return 6 * 60 * 60 * 1000;
        case TimeResolution.TWELVE_HOURS: return 12 * 60 * 60 * 1000;
        case TimeResolution.ONE_DAY: return 1 * 24 * 60 * 60 * 1000;

        //case TimeResolution.ONE_MONTH:
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
    if (isNullOrUndefined(input)) {
        return null;
    }
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


export interface Duration {
    milliseconds: number;
    seconds: number;
    minutes: number;
    hours: number;
    days: number;
}

export function presentDuration(duration: Duration | number, args = {}) {
    if (isNullOrUndefined(duration)) {
        return "(unknown)";
    }

    if (typeof duration === "number") {
        const ms = duration as number;

        let milliseconds = Math.floor((ms % 1000) / 100);
        let seconds = Math.floor((ms / 1000) % 60);
        let minutes = Math.floor((ms / (1000 * 60)) % 60);
        let hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        let days = Math.floor((ms / (1000 * 60 * 60 * 24)));

        duration = {
            milliseconds,
            seconds,
            minutes,
            hours,
            days,
        };
    }

    const appliedArgs = Object.assign({}, DEFAULT_PRESENT_DURATION_ARGS, args);
    const { abs, short, noMs, noSeconds } = appliedArgs;

    const { days, hours, milliseconds, minutes, seconds } = duration;

    const numMilliseconds = abs ? Math.abs(milliseconds) : milliseconds;
    const numSeconds = abs ? Math.abs(seconds) : seconds;
    const numMinutes = abs ? Math.abs(minutes) : minutes;
    const numHours = abs ? Math.abs(hours) : hours;
    const numDays = abs ? Math.abs(days) : days;

    let pieces: string[] = [];
    if (Math.abs(numDays) > 0) {
        pieces.push(numDays + (short ? "d" : " days"));
    }
    if (Math.abs(numHours) > 0) {
        pieces.push(numHours + (short ? "h" : " hours"));
    }
    if (Math.abs(numMinutes) > 0) {
        pieces.push(numMinutes + (short ? "m" : " mins"));
    }
    if (!noSeconds && Math.abs(numSeconds) > 0) {
        pieces.push(numSeconds + (short ? "s" : " secs"));
    }
    if (!noMs && Math.abs(numMilliseconds) > 0) {
        pieces.push(numMilliseconds + (short ? "ms" : " ms"));
    }

    return pieces.join(", ");
}
