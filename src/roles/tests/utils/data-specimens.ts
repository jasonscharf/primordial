import { PriceDataParameters } from "../../common/models/system/PriceDataParameters";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { from } from "../../common/utils/time";
import { env } from "../includes";


export interface MarketDataSpecimen extends PriceDataParameters {
    name: string;
}

type MarketSpecimenCategory = { [key: string]: MarketDataSpecimen};


export const random: MarketSpecimenCategory = {
    // Just a random sample of BTC/USDT data for testing.
    btcUsdt1HourOctober2021: <MarketDataSpecimen>{
        name: "random.btc-usdt-1-hour-october-2021",
        exchange: env.PRIMO_DEFAULT_EXCHANGE,
        symbolPair: "BTC/USDT",
        res: TimeResolution.ONE_HOUR,
        from: from("2021-10-01T00:00:00"),
        to: from("2021-10-25T00:00:00"),
        fillMissing: true,
        fetchDelay: 1000,
    },
};
