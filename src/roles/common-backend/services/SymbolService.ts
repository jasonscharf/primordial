import ccxt, { Dictionary } from "ccxt";
import { DateTime } from "luxon";
import env from "../env";
import { Money } from "../../common/numbers";
import { Price } from "../../common/models/markets/Price";
import { PriceDataParameters } from "../../common/models/system/PriceDataParameters";
import { PriceEntity } from "../../common/entities/PriceEntity";
import { SymbolResultSet } from "../../common/models/system/SymbolResultSet";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { TradeSymbol, TradeSymbolType } from "../../common/models/markets/TradeSymbol";
import { TradeSymbolEntity } from "../../common/entities/TradeSymbolEntity";
import { cache, db, log } from "../includes";
import { caching, limits, queries, tables } from "../constants";
import { getPostgresDatePartForTimeRes, getTimeframeForResolution, millisecondsPerResInterval, normalizePriceTime, splitRanges } from "../../common/utils/time";
import { query } from "../database/utils";
import { randomString, sleep } from "../../common/utils";
import { sym } from "../services";


/**
 * Represents a request to update definitions or prices for a particular, matching set of symbols.
 */
// TODO: Better name and local...this is effectively an "InputSet" or "SymbolSet" in the design parlance
export interface UpdateSymbolsState {
    filterByBase?: string;
    filterByQuote?: string;
}

export interface PriceDataRange {
    exchange: string;
    symbolPair: string;
    start: Date;
    end: Date;
}

export const DEFAULT_PRICE_DATA_PARAMETERS: Partial<PriceDataParameters> = {
    exchange: env.PRIMO_DEFAULT_EXCHANGE,
    symbolPair: "BTC/TUSD",
    res: TimeResolution.ONE_MINUTE,
    from: DateTime.fromISO("2010-01-01").toJSDate(),
    to: new Date(),
    fetchDelay: 1000,
    fillMissing: true,
};

/**
 * Handles the reading and writing of tradeable symbol pairs.
 * For equities, USD can be assumed to be the quote side.
 */
export class SymbolService {

    // This is the system's Binance account.
    protected _exchange: ccxt.binance = null;
    protected _markets: ccxt.Dictionary<ccxt.Market> = null;


    constructor() {
        this._exchange = new ccxt.binance({
            // TODO
        });
    }

    /**
     * Returns the default "global" watchlist.
     */
    async getGlobalWatchlistSymbolPairs(): Promise<string[]> {

        // Just temporary standins. Ultimately they should be everything always, from every exchange ever.
        return [
            "BTC/USDT",
            "ETH/USDT",
            "BCH/USDT",
            "XRP/USDT",
            "BUSD/BUSD",
            "DOGE/USDT",
            "ADA/USDT",
            "C98/USDT",
            "SOL/USDT",
            "NANO/USDT",
            "DOT/USDT",
            "XMR/USDT",
        ];
    }


    /**
     * Get all symbols actively trading in live or forward test mode.
     * @param requestingUserId 
     * @param workspaceId 
     * @param exchangeId 
     */
    async getActivelyTradingSymbolPairs(requestingUserId: string, workspaceId: string, exchangeId = env.PRIMO_DEFAULT_EXCHANGE) {
        // SECURITY: TODO

        const symbolPairs = await query(queries.SYMBOLS_ACTIVE_PER_WORKSPACE, async db => {
            const { rows } = await db
                .raw(
                    `
                    SELECT "symbols",
                        "stateInternal"->>'baseSymbolId' AS base,
                        "stateInternal"->>'quoteSymbolId' As "quote" -- heh
                    FROM bot_instances
                    WHERE "exchangeId = ::exchange
                        AND "modeId" = 'test-forward' OR "modeId" = 'test-live';
                    `
                );
        });


    }

    /**
     * Loads market definitions for a given exchange.
     * @param exchange
     */
    async loadMarketDefinitions(exchange = env.PRIMO_DEFAULT_EXCHANGE): Promise<ccxt.Dictionary<ccxt.Market>> {
        if (this._markets) {
            return this._markets;
        }
        else {
            log.info(`Fetching market definitions from ${exchange}...`);
            return this._markets = await this._exchange.loadMarkets();
        }
    }

    /**
    * Fetches all known symbols for a particular exchange.
    * @param exchange 
    */
    async getKnownSymbols(exchange = env.PRIMO_DEFAULT_EXCHANGE): Promise<TradeSymbol[]> {
        return query(queries.SYMBOLS_LIST_NAMES, async trx => {
            interface Row {
                id: string;
            }
            const rows = <Row[]>await db(tables.TradeSymbols)
                .select("*")
                ;

            return rows.map(TradeSymbolEntity.fromRow);
        });
    }

    /**
     * Fetches all known symbol names for a particular exchange.
     * @param exchange 
     */
    async getKnownSymbolNames(exchange = env.PRIMO_DEFAULT_EXCHANGE): Promise<string[]> {
        return query(queries.SYMBOLS_LIST_NAMES, async trx => {
            interface Row {
                id: string;
            }
            const rows = <Row[]>await db(tables.TradeSymbols)
                .select("id")
                ;

            return rows.map(row => row.id);
        });
    }

    /**
     * 
     * @param res 
     */
    async lastSymbolPricing(res = TimeResolution.ONE_MINUTE) {
        // TODO
    }

    /**
     * Gets symbols prices, pulling them in discrete batches from an exchange as needed.
     * @param params 
     */
    async getSymbolPriceData(params: Partial<PriceDataParameters>): Promise<SymbolResultSet> {
        const symbolPairsToUpdate = [params.symbolPair];
        const appliedParams = Object.assign({}, DEFAULT_PRICE_DATA_PARAMETERS, params);

        const { exchange, fetchDelay, fillMissing, from, to, res, symbolPair } = appliedParams;


        const syncRangesForSymbols = new Map<string, PriceDataRange[]>();

        // Deal with specific gaps in Binance data. #exchange
        function shouldInclude(range: PriceDataRange) {
            // See: https://www.binance.com/en/support/announcement/849160fe70214641baa6385619595aa1 for likely explanation
            return !(range.start.toISOString() === "2021-04-25T04:01:00.000Z" && range.end.toISOString() === "2021-04-25T08:44:59.999Z");
        }

        for (const pair of symbolPairsToUpdate) {
            const splits: PriceDataRange[] = [];

            // Only pull up the current interval.
            const end = normalizePriceTime(res, to || new Date());

            const missingRanges = await sym.getMissingRanges(exchange, pair, res, from, end);
            if (missingRanges.length === 0) {
                continue;
            }
            else {

                // Split up ranges so we're not requesting more than the candlestick limit
                splits.push(...missingRanges
                    .filter(shouldInclude)
                    .map(range => splitRanges(res, range, limits.MAX_API_PRICE_FETCH_OLHC_ENTRIES))
                    .flat()
                    .map(range => (<PriceDataRange>{
                        exchange,
                        start: range.start,
                        end: range.end,
                        symbolPair: pair,
                    }))
                );
            }

            if (splits.length > 0) {
                console.log(`[SYNC][${pair}] has ${splits.length} ranges left to sync`);
            }

            // 
            syncRangesForSymbols.set(pair, splits.reverse());
        }

        // Grab N sync operations across the top priority symbols
        const ops: PriceDataRange[] = [];

        for (const [symbolPairToSync] of syncRangesForSymbols.entries()) {

            const rangesForSymbol = syncRangesForSymbols.get(symbolPairToSync);
            ops.push(...rangesForSymbol);
        }

        for (const op of ops) {
            const { end, exchange, start, symbolPair } = op;

            log.debug(`[SYNC] UPDATE '${symbolPair}' from ${start.toISOString()} to ${end.toISOString()}`);
            const update = await sym.updateSymbolPrices(exchange, symbolPair, res, start, end);

            //log.debug(`[SYNC] Fetched ${update.length} prices for [${symbolPair}] at resolution ${res}`);

            await sleep(fetchDelay);
        }


        // Re-evaluate missing ranges
        const missingRanges = await sym.getMissingRanges(exchange, symbolPair, res, from, to);
        const warnings: string[] = [];
        if (missingRanges.length > 0) {
            warnings.push(`Missing 1 or more ranges`);
        }

        const prices = await sym.queryPricesForRange(params);
        const sus: SymbolResultSet = {
            warnings,
            missingRanges,
            prices,
        };

        return sus;
    }

    /**
     * Adds a single symbol price to the database.
     * @param props
     * @returns 
     */
    async addSymbolPrice(props: Partial<Price>): Promise<Price> {
        return query(queries.SYMBOLS_PRICES_ADD, async trx => {

            // Ensure we are reflecting the raw (string-form) values as well (for now)
            const priceProps: Partial<Price> = Object.assign({}, props, <Partial<Price>>{
                openRaw: props.open.toString(),
                closeRaw: props.close.toString(),
                lowRaw: props.low.toString(),
                highRaw: props.high.toString(),
            });

            const cols = [
                "baseSymbolId",
                "quoteSymbolId",
                "exchangeId",
                "resId",
                "ts",
                "open",
                "high",
                "low",
                "close",
                "volume",
                "openRaw",
                "highRaw",
                "lowRaw",
                "closeRaw",
            ].map(col => `"${col}"`);

            const { rows } = await db
                .raw(`
                INSERT INTO ${tables.Prices} (${cols.join(", ")})
                VALUES (?, ?, ?, ?, ?, ?::decimal, ?::decimal, ?::decimal, ?::decimal, ?::decimal, ?, ?, ?, ?)
                ON CONFLICT DO NOTHING
                RETURNING *`, [
                    priceProps.baseSymbolId,
                    priceProps.quoteSymbolId,
                    priceProps.exchangeId,
                    priceProps.resId,
                    priceProps.ts,
                    priceProps.open.toString(),
                    priceProps.high.toString(),
                    priceProps.low.toString(),
                    priceProps.close.toString(),
                    priceProps.volume.toString(),
                    priceProps.openRaw,
                    priceProps.highRaw,
                    priceProps.lowRaw,
                    priceProps.closeRaw,
                ])
                .transacting(trx)
                ;

            return PriceEntity.fromRow(rows[0]);
        });
    }

    /**
     * Adds sorted, well-formed (time bucketed) pricing data.
     * NOTE: All prices must be for the same symbol.
     * @param exchange 
     * @param rawPrices 
     */
    async addPriceData(exchange: string, res: TimeResolution, rawPrices: Partial<Price>[]): Promise<void> {
        if (rawPrices.length < 1) {
            return;
        }

        // Bulk inserting Money types is tricky, and we'll need to cast each row's monetary values.
        // To do so, we bulk insert into a test table, and then sort and cast with a subsequence.

        // Knex doesn't handle Money (Big) quite right, so we need to explicitly toString it here
        const prices = rawPrices.map(p => {
            return {
                ...p,
                open: p.open.toString(),
                close: p.close.toString(),
                low: p.low.toString(),
                high: p.high.toString(),
                volume: p.volume.toString(),
            }
        });

        // TODO: WIP rough draft of using a "staging" table to insert string data, which
        // can then be properly casted into a single insert statement from said table.

        const tempTableName = `temp-import-prices-` + randomString();
        return query(queries.SYMBOLS_PRICES_ADD_BULK, async trx => {
            const tt = await trx.raw(`CREATE TEMPORARY TABLE "${tempTableName}" (
                "ts" TIMESTAMP WITH TIME ZONE,
                "baseSymbolId" VARCHAR,
                "quoteSymbolId" VARCHAR,
                "exchangeId" VARCHAR,
                "resId" VARCHAR,
                "openRaw" VARCHAR, "closeRaw" VARCHAR, "lowRaw" VARCHAR, "highRaw" VARCHAR,
                "volume" VARCHAR,
                "open" VARCHAR,
                "close" VARCHAR,
                "low" VARCHAR,
                "high" VARCHAR
            )`);

            // Add to staging table 
            await trx(tempTableName).insert(prices);

            const numType = `numeric(${env.PRIMO_CURRENCY_PRECISION}, ${env.PRIMO_CURRENCY_SCALE})`;

            const start = prices[0].ts;
            const end = prices[prices.length - 1].ts;

            // Take the base and quote from the first price
            const base = prices[0].baseSymbolId;
            const quote = prices[0].quoteSymbolId;

            // Select with casts into prices table.
            // NOTE: Might make sense to actually pull from the staging table with time_bucket in order to normalizes timestamps.
            const bindings = {
                exchange: exchange,
                res,
                base,
                quote,
                start,
                end,
            };


            const pgDatePart = getPostgresDatePartForTimeRes(res);
            const tsdbTimeframe = getTimeframeForResolution(res);

            // Insert the raw data into a temporary table, and then select it into the prices table, applying
            // gap-filling and performing the appropriate numeric casts. This is to work around the lack of
            // "time_bucket_gapfill" in Apache 2.0 licensed TSDB, which is what Azure uses.
            // Note the inclusive logic in the WHERE - this is to match up with buckets.
            const q = await trx.raw(
                `
                INSERT INTO ${tables.Prices} ("ts", "baseSymbolId", "quoteSymbolId", "exchangeId", "resId", "openRaw", "closeRaw", "lowRaw", "highRaw",
                    "volume", "open", "close", "low", "high") (
                        WITH time_series AS (
                            SELECT generate_series(:start::timestamp, :end::timestamp, interval '${tsdbTimeframe}') as tf
                        )
                        SELECT
                            time_series.tf as ts, 
                            :base AS "baseSymbolId",
                            :quote AS "quoteSymbolId",
                            :exchange AS "exchangeId",
                            :res AS "resId",

                            last("openRaw", ts),
                            last("closeRaw", ts),
                            last("lowRaw", ts),
                            last("highRaw", ts),

                            COALESCE(
                                LAST(volume::${numType}, ts),
                                    LAG(LAST(volume::${numType}, ts)) OVER (ORDER BY time_series.tf ASC), 0)::${numType} as volume,

                            COALESCE(
                                LAST(open::${numType}, ts),
                                    LAG(LAST(open::${numType}, ts)) OVER (ORDER BY time_series.tf ASC), 0)::${numType} as open,

                            COALESCE(
                                LAST(close::${numType}, ts),
                                    LAG(LAST(close::${numType}, ts)) OVER (ORDER BY time_series.tf ASC), 0)::${numType} as close,

                            COALESCE(
                                LAST(low::${numType}, ts),
                                    LAG(LAST(low::${numType}, ts)) OVER (ORDER BY time_series.tf ASC), 0)::${numType} as low,

                            COALESCE(
                                LAST(high::${numType}, ts),
                                    LAG(LAST(high::${numType}, ts)) OVER (ORDER BY time_series.tf ASC), 0)::${numType} as high

                        FROM time_series
                        LEFT JOIN "${tempTableName}" on date_trunc('${pgDatePart}', "${tempTableName}".ts) = time_series.tf
                        WHERE time_series.tf >= :start AND time_series.tf <= :end
                        GROUP BY time_series.tf, ts
                        ORDER BY time_series.tf ASC
                )
                ON CONFLICT DO NOTHING
                `, bindings);

            return;
        });
    }

    /**
     * Updates symbol prices for some exchange, for some timeframe.
     * @param args 
     * @param symbolList
     */
    async updateGlobalSymbolPrices(args: UpdateSymbolsState, symbolList = "*.*") {
        // MOVED
    }

    /**
     * Derives a trade symbol from a CCXT market definition.
     * Not all fields are populated - the sign must be populated later.
    * @param symbol 
    * @param base
    */
    deriveTradeSymbolFromCCXT(symbol: string, base = true): Partial<TradeSymbol> {
        const id = symbol.toUpperCase();
        const def = this._exchange.currencies[symbol];
        if (!def) {
            throw new Error(`Could not find definition for symbol '${symbol}' in exchange '${this._exchange.id}'`);
        }

        const displayUnits = def.precision;
        const newSymbol: Partial<TradeSymbol> = {
            typeId: TradeSymbolType.CRYPTO,
            id,
            displayName: id,
            sign: id,
            displayUnits,
        };

        return newSymbol;
    }

    /**
     * Adds a new unique trade symbol to the DB, e.g. a cryptocurrency or an equity.limits
     * Every symbol (including equities) has a base symbol (the asset) and a quote symbol (e.g. BTC, USD, CAD, etc)
     * @param props 
     * @returns 
     */
    async addSymbol(props: Partial<TradeSymbol>): Promise<TradeSymbol> {
        console.log(`Adding symbol with props`, props);
        return query(queries.SYMBOLS_ADD, async trx => {
            const [row] = <TradeSymbol[]>await trx(tables.TradeSymbols)
                .insert(props)
                .returning("*")
                ;

            return TradeSymbolEntity.fromRow(row);
        });
    }

    /**
     * Queries a time-series of prices from the database, bucketed at the given resolution, e.g. 1 min.
     * Returns rows with null values where data is missing.
     * Does not pull any missing price data from external APIs.
     * @param exchange limits
     * @param start 
     * @param end 
     */
    async queryPricesForRange(params: Partial<PriceDataParameters>): Promise<Price[]> {
        const appliedParams = Object.assign({}, DEFAULT_PRICE_DATA_PARAMETERS, params);
        const { exchange, to: end, fillMissing, res, from: start, symbolPair } = appliedParams;
        const [base, quote] = this.parseSymbolPair(symbolPair);
        const tf = getTimeframeForResolution(res);


        // Passing the time resolution as a bound variable breaks the query, so we have to
        // sanitize and inject it verbatim, unfortunately :/
        let safeRes: TimeResolution = null;
        if (!Object.values(TimeResolution).includes(res)) {
            throw new Error(`Unknown time resolution '${res}'`);
        }
        else {
            safeRes = res;
        }

        // Note the lack of gap filling here - this is done on data ingestion.
        return query(queries.SYMBOLS_PRICES_QUERY, async db => {
            const pgDatePart = getPostgresDatePartForTimeRes(res);
            const query = `
                WITH time_range AS (
                    SELECT date_trunc(:pgDatePart, dd)::timestamp AS "generated"
                    FROM generate_series
                            ( :start::timestamp
                            , :end::timestamp
                            , :tf::interval) dd
                ),
                time_range_buckets AS (
                    SELECT time_bucket('${safeRes}', generated) as generated
                    FROM time_range
                ),
                existing_prices AS (
                    SELECT time_bucket('${safeRes}', ts) as ts,
                        FIRST(open, ts) as open,
                        MIN(low) as low,
                        MAX(high) as high,
                        LAST(close, ts) as closed,
                        SUM(volume) as volume
                    FROM prices
                    WHERE "exchangeId" = :exchange
                    AND ("baseSymbolId" = :base AND "quoteSymbolId" = :quote) 
                    AND ("ts" >= :start AND "ts" < :end)
                    GROUP BY time_bucket('${res}', ts)
                    ORDER BY ts ASC
                )
                SELECT time_bucket('${safeRes}', ts) as ts,
                        :base as "baseSymbolId",
                        :quote as "quoteSymbolId",
                        :exchange as "exchangeId",
                        :safeRes as "resId",
                        LAST(existing_prices.closed, ts) as "close",
                        FIRST(existing_prices.open, ts) as open,
                        MIN(existing_prices.low) as low,
                        MAX(existing_prices.high) as high,
                        SUM(volume) as volume
                FROM existing_prices
                JOIN time_range_buckets ON "ts" = "generated"
                GROUP BY ts
                ORDER BY ts ASC
            `;

            const bindings = {
                tf,
                pgDatePart,
                exchange,
                safeRes,
                base,
                quote,
                start,
                end,
            };

            const { rows } = await db.raw(query, bindings);
            return rows.map(row => PriceEntity.fromRow(row));
        });
    }

    /**
     * Fetches raw price data from the default exchange.
     * @param exchange 
     * @param symbolPair 
     * @param res 
     * @param start 
     * @param end 
     */
    async fetchPriceDataFromExchange(args: PriceDataParameters) {
        const { exchange, from, res, symbolPair, to } = args;
        const [base, quote] = this.parseSymbolPair(symbolPair);
        const intervals = (to.getTime() - from.getTime()) / millisecondsPerResInterval(res);
        const limit = Math.min(Math.ceil(intervals), limits.MAX_API_PRICE_FETCH_OLHC_ENTRIES);

        console.info(`API request for candles `, args);
        const data = await this._exchange.fetchOHLCV(symbolPair, res, from.getTime(), limit);
        const prices = data.map(d => {
            const [ms, openFloat, highFloat, lowFloat, closeFloat, volumeFloat] = d;
            const price: Partial<Price> = {
                ts: new Date(ms),
                exchangeId: exchange,
                baseSymbolId: base,
                quoteSymbolId: quote,
                resId: res,
                open: Money(openFloat.toString()),
                low: Money(lowFloat.toString()),
                high: Money(highFloat.toString()),
                close: Money(closeFloat.toString()),
                volume: Money(volumeFloat.toString()),
            };

            return price;
        });

        return [data, prices];
    }

    /**
     * Updates symbol prices in the database.
     * @param exchange 
     * @param symbolPair 
     * @param from 
     * @param to 
     */
    async updateSymbolPrices(exchange: string, symbolPair: string, res: TimeResolution, from: Date, to: Date = new Date(), sync = true): Promise<Price[]> {
        const [base, quote] = this.parseSymbolPair(symbolPair);
        const nowMs = this._exchange.milliseconds();
        const startMs = from.getTime();


        if (startMs > nowMs) {
            throw new Error(`Invalid start/end dates`);
        }

        const intervalMs = millisecondsPerResInterval(res);

        // Figure out what data needs to be pulled.
        const missingRanges = await this.getMissingRanges(exchange, symbolPair, res, from, to);

        const params: ccxt.Params = {};
        const rp = [];
        for (const r of missingRanges) {

            // NOTE: Since we're issuing an API request based on missing ranges, there is a worst-case scenario
            // where every second candle is missing, and we ended up hitting rate-limits as a result of the volume
            // of API requests. Some sort of cross-exchange API quota mechanism needs to be put in place, ultimately.

            try {
                const limit = Math.min(Math.ceil((r.end.getTime() - r.start.getTime()) / intervalMs), limits.MAX_API_PRICE_FETCH_OLHC_ENTRIES);
                const args: PriceDataParameters = {
                    exchange,
                    symbolPair,
                    res,
                    from,
                    to,
                };
                const [rawData, prices] = await this.fetchPriceDataFromExchange(args);
                const result = await sym.addPriceData(exchange, res, prices as Price[]);
            }
            catch (err) {
                if (err.detail) {
                    log.error(`[SYNC] Error: ${err.detail}`)
                }
                else {
                    log.error(`Error updating '${symbolPair}' for ${from}-${to} from ${exchange}`, err);
                }
            }
        }

        // TODO: SymbolUpdateSummary
        return [];
    }

    /**
     * Fetches a symbol from the database by its ID.
     * Returns null if the symbol does not exist.
     * @param id 
     * @returns 
     */
    async getSymbol(id: string): Promise<TradeSymbol> {
        return query(queries.SYMBOLS_GET, async trx => {
            const rows = <TradeSymbol[]>await trx(tables.TradeSymbols)
                .select("*")
                .where({ id })
                ;

            return rows.length > 0 ? TradeSymbolEntity.fromRow(rows[0]) : null;
        });
    }

    /**
     * Returns a set of range objects indicating missing price data for a given range.
     * @param exchange 
     * @param symbolPair 
     * @param res 
     * @param start 
     * @param end 
     */
    async getMissingRanges(exchange: string, symbolPair: string, res: TimeResolution, start: Date, end: Date = new Date()): Promise<PriceDataRange[]> {

        // NOTE: This assumes markets are open 24/7! In other words... crypto only (for now)

        const [baseName, quoteName] = this.parseSymbolPair(symbolPair);
        const [base, quote] = await Promise.all([
            this.getSymbol(baseName),
            this.getSymbol(quoteName),
        ]);

        if (!base) {
            throw new Error(`Unknown base symbol '${baseName}'`);
        }
        else if (!quote) {
            throw new Error(`Unknown quote symbol '${quoteName}'`);
        }

        // Pull ranges, filling with null values where no data exists
        const pgDatePart = getPostgresDatePartForTimeRes(res);
        const tf = res;
        return query(queries.SYMBOLS_PRICES_RANGES, async db => {
            const q = `
                WITH time_range AS (
                    SELECT date_trunc(:pgDatePart, dd)::timestamp AS "generated"
                    FROM generate_series
                            ( :start::timestamp 
                            , :end::timestamp
                            , :tf::interval) dd
                ),
                time_range_buckets AS (
                    SELECT time_bucket(:tf, generated) as generated
                    FROM time_range
                ),
                existing_prices AS (
                    SELECT time_bucket(:tf, ts) as ts
                    FROM prices
                    WHERE "exchangeId" = :exchange
                    AND ("resId" = :res)
                    AND ("baseSymbolId" = :base AND "quoteSymbolId" = :quote) 
                    AND ("ts" >= :start AND "ts" < :end)
                    GROUP BY "ts"
                    ORDER BY "ts"
                )
                SELECT *
                FROM time_range_buckets
                LEFT JOIN existing_prices ON "ts" = "generated"
            `;

            const bindings = {
                tf,
                pgDatePart,
                exchange,
                res,
                base: base.id,
                quote: quote.id,
                start,
                end,
            };

            // Derive contiguous empty ranges
            const { rows } = await db.raw(q, bindings);
            const ranges: PriceDataRange[] = [];

            let lastDate: Date = null;
            let currRange: PriceDataRange = null;
            let inEmptyRange = false;

            for (const row of rows) {
                if (row.generated >= end) {
                    continue;
                }
                else if (row.ts === null) {
                    if (!inEmptyRange) {
                        inEmptyRange = true;

                        currRange = {
                            exchange,
                            start: row.generated,
                            symbolPair,
                            end: null,
                        };

                        ranges.push(currRange);
                    }
                    else if (currRange) {
                        currRange.end = new Date(row.ts - 1);
                    }
                }
                else if (inEmptyRange) {
                    currRange.end = new Date(row.ts - 1);
                    currRange = null;
                    inEmptyRange = false
                }
            }

            if (currRange) {
                currRange.end = end;
            }

            return ranges;
        });
    }

    /**
     * Parses a separated symbol pair such as "ETH/BTC" or "ETH_BTC".
     * @param pair 
     */
    parseSymbolPair(pair: string): string[] {
        const pieces = pair.split(/[_\/\\-]/);
        if (pieces.length > 2 || pieces.length === 0) {
            throw new Error(`Malformed symbol pair '${pair}'`);
        }

        return pieces.map(p => p.toUpperCase());
    }
}
