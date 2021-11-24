import Binance, { Candle } from "binance-api-node";
import env from "../common-backend/env";
import { Money } from "../common/numbers";
import { Price } from "../common/models/markets/Price";
import { PriceUpdateMessage } from "../common-backend/messages/trading";
import { QueueMessage } from "../common-backend/messages/QueueMessage";
import { TimeResolution } from "../common/models/markets/TimeResolution";
import { TradeSymbol } from "../common/models/markets/TradeSymbol";
import { constants, log, mq } from "../common-backend/includes";
import { normalizePriceTime } from "../common/utils/time";
import { sym } from "../common-backend/services";


const client = Binance({
    apiKey: env.PRIMO_SYSTEM_BINANCE_API_KEY,
    apiSecret: env.PRIMO_SYSTEM_BINANCE_API_SECRET,
});

const conns = new Map<string, boolean>();
const symbolDefs = new Map<string, TradeSymbol>();
const lookup = new Map<string, [TradeSymbol, TradeSymbol]>();

/**
 * Connects to Binance and requests kline/candlesticks for the global symbol watchlist.
 * NOTE: Candles are actually received every 2(ish) seconds, even when the time resolution is higher.
 */
export async function connectToBinanceWebSocket() {
    const symbolPairs = await sym.getGlobalWatchlistSymbolPairs();

    const res = TimeResolution.ONE_MINUTE;

    // ... extract

    log.debug(`Building symbol lookup table for socket messages...`);
    console.info(`Symbol Pairs`, symbolPairs);
    const tradeSymbols = await sym.getKnownSymbols();
    for (const symbol of tradeSymbols) {
        symbolDefs.set(symbol.id, symbol);
    }

    for (const pair of symbolPairs) {
        const [baseId, quoteId] = pair.split(/[\/_]/);
        const base = symbolDefs.get(baseId);
        const quote = symbolDefs.get(quoteId);
        const joined = baseId + quoteId;
        lookup.set(joined, [base, quote]);
    }

    console.log(`Connecting to Binance WebSocket...`, symbolPairs);

    // Don't connect during tests
    if (!env.isTest()) {
        client.ws.candles(symbolPairs.map(s => s.replace(/[\/_]/, "")), res, c => handleCandle(c.symbol, res, c));
    }
}

export function disconnectBinanceWebSocket() {
    // ...
}

function lookupSymbolPair(pair: string) {
    const hasPair = lookup.has(pair);
    if (!hasPair) {
        throw new Error(`Unknown symbol pair '${pair}'`);
    }

    return lookup.get(pair);
}


/**
 * Handles an incoming candlestick OHLCV tick for a specific symbol pair.
 * Note that even when the time resolution is greater than the tick size,
 * all symbols will tick anyways, with ticks bearing the "isFinal" flag set
 * to true when the tick represent the closing of the interval for the 
 * specified time resolution.
 * @param symbolPair 
 * @param res 
 * @param candle 
 */
export function handleCandle(symbolPair: string, res: TimeResolution, candle: Candle) {
    try {
        if (env.isDev()) {
            //console.log(`Handle candle for ${symbolPair} @ ${new Date().toISOString()}`);
        }

        const receivedTs = candle.eventTime;
        const startTime = normalizePriceTime(res, new Date(candle.startTime));
        const eventTime = new Date(candle.eventTime);
        const [baseSymbol, quoteSymbol] = lookupSymbolPair(symbolPair);

        if (!baseSymbol) {
            throw new Error(`Unknown base symbol for '${symbolPair}'`);
        }

        if (!quoteSymbol) {
            throw new Error(`Unknonw quote symbol for '${symbolPair}'`);
        }

        const resId = candle.isFinal ? res : TimeResolution.TWO_SECONDS;

        const open = Money(candle.open);
        const low = Money(candle.low);
        const high = Money(candle.high);
        const close = Money(candle.close);
        const volume = Money(candle.volume);

        const price: Partial<Price> = {
            exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
            baseSymbolId: baseSymbol.id,
            quoteSymbolId: quoteSymbol.id,
            resId: TimeResolution.ONE_SECOND,
            ts: startTime,
            open,
            low,
            high,
            close,
            volume,
        };


        const sentTs = Date.now();
        const msg: QueueMessage<PriceUpdateMessage> = {
            name: constants.events.EVENT_PRICE_UPDATE,
            receivedTs,
            sentTs,
            payload: {
                ...price as Price,
            }
        };

        // Fire and forget price update to both queues
        mq.addWorkerMessageHi(constants.events.EVENT_PRICE_UPDATE, msg);

        if (candle.isFinal) {
            sym.addPriceData(env.PRIMO_DEFAULT_EXCHANGE, res, [price])
                .then(() => log.debug(`Updated ${symbolPair} from Binance WebSocket. P: ${price.close.toString()} L/H: ${price.low.toString()}/${price.high.toString()} V: ${price.volume}`))
                .catch(err => log.error(`Error saving price for '${baseSymbol.id}/${quoteSymbol.id}' @ ${price.ts.toISOString()}`, err))
                ;
        }
    }
    catch (err) {
        log.error(`Handle candle for '${symbolPair}' failed`, err);
    }
};
