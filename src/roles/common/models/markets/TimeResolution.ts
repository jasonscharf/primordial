/**
 * Represents time resolutions for price intervals.
 */
export enum TimeResolution {
    ONE_SECOND = "1s",
    TWO_SECONDS = "2s",
    ONE_MINUTE = "1m",
    FIVE_MINUTES = "5m",
    FIFTEEN_MINUTES = "15m",
    ONE_HOUR = "1h",
    TWO_HOURS = "2h",
    FOUR_HOURS = "4h",
    SIX_HOURS = "6h",
    TWELVE_HOURS = "12h",
    ONE_DAY = "1d",
    ONE_WEEK = "1w",

    // Note: conflicts with "1m" in TSOA codegen...
    //ONE_MONTH = "1M",
}

export const SUPPORTED_TIME_RESOLUTIONS = [
    //TimeResolution.ONE_MINUTE,
    TimeResolution.FIVE_MINUTES,
    TimeResolution.FIFTEEN_MINUTES,
    TimeResolution.ONE_HOUR,
    TimeResolution.TWO_HOURS,
    TimeResolution.FOUR_HOURS,
    TimeResolution.SIX_HOURS,
    TimeResolution.TWELVE_HOURS,
    TimeResolution.ONE_DAY,
];
