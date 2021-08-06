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
        case TimeResolution.ONE_MINUTE: return removeMinutes(ts);
        case TimeResolution.FIVE_MINUTES: return floorToMinutes(ts, 5);
        case TimeResolution.FIFTEEN_MINUTES: return floorToMinutes(ts, 15);
        case TimeResolution.ONE_HOUR: return removeMinutes(ts);
        case TimeResolution.ONE_DAY: return removeHours(ts);
        case TimeResolution.ONE_MONTH: return removeDays(ts);
        default:
            throw new Error(`Unknown/unsupported time resolution '${res}'`);
    }
}