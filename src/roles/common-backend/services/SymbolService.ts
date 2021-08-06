import ccxt, { Dictionary } from "ccxt";
import env from "../env";
import { Price } from "../../common/models/system/Price";
import { PriceEntity } from "../../common/entities/PriceEntity";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { TradeSymbol, TradeSymbolType } from "../../common/models/markets/TradeSymbol";
import { TradeSymbolEntity } from "../../common/entities/TradeSymbolEntity";
import { cache, db, log } from "../includes";
import { caching, queries, tables } from "../constants";
import { query } from "../database/utils";


/**
 * Represents a request to update definitions or prices for a particular, matching set of symbols.
 */
// TODO: Better name and local...this is effectively an "InputSet" or "SymbolSet" in the design parlance
export interface UpdateSymbolsState {
    filterByBase?: string;
    filterByQuote?: string;
}


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
     * Loads market definitions for a given exchange.
     * @param exchange
     */
    async loadMarketDefinitions(exchange = env.PRIMO_DEFAULT_EXCHANGE): Promise<ccxt.Dictionary<ccxt.Market>> {
        this._markets = await cache.delegateObject(`markets-all-${env.PRIMO_DEFAULT_EXCHANGE}`, caching.EXP_MARKETS_ALL, async () => {
            return this._exchange.loadMarkets();
        });

        return this._markets;
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
     * Adds a single symbol price to the database.
     * @param props
     * @returns 
     */
    async addSymbolPrice(props: Partial<Price>): Promise<Price> {
        return query(queries.SYMBOLS_PRICE_ADD, async trx => {

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
                .raw(`INSERT INTO ${tables.Prices} (${cols.join(", ")}) VALUES (?, ?, ?, ?, ?, ?::decimal, ?::decimal, ?::decimal, ?::decimal, ?, ?, ?, ?, ?) RETURNING *`, [
                    priceProps.baseSymbolId,
                    priceProps.quoteSymbolId,
                    priceProps.exchangeId,
                    priceProps.resId,
                    priceProps.ts,
                    priceProps.open.toString(),
                    priceProps.high.toString(),
                    priceProps.low.toString(),
                    priceProps.close.toString(),
                    priceProps.volume,
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
     * Updates symbol prices for some exchange, for some timeframe.
     * @param args 
     * @param symbolList 
     */
    async updateGlobalSymbolPrices(args: UpdateSymbolsState, symbolList = "*.*") {
        const metrics = {
            totalExchanges: 0,
            totalMarkets: 0,
            filteredMarkets: 0,
            numSymbols: 0,
            newSymbols: [],
        };

        // NOTE: In the future, this will support multiple exchanges. Assume a loop below.
        const exchange = env.PRIMO_DEFAULT_EXCHANGE;
        metrics.totalExchanges = 1;

        // For each market, load all (filtered) symbols
        const marketsForExchange = await this.loadMarketDefinitions();
        const markets = Object.keys(marketsForExchange);
        metrics.totalMarkets = markets.length;

        // Apply market filters from state
        const { filterByBase, filterByQuote } = args;
        const filteredMarkets = markets
            .map(k => marketsForExchange[k])
            .filter(m => filterByBase ? new RegExp(filterByBase).test(m.base) : true)
            .filter(m => filterByQuote ? new RegExp(filterByQuote).test(m.quote) : true)
            ;
        metrics.filteredMarkets = filteredMarkets.length;

        // Ensure we have definitions for each symbol referenced by our filtered market set.
        const baseSymbols = filteredMarkets.map(m => m.base);
        const quoteSymbols = filteredMarkets.map(m => m.quote);
        const uniqueSymbols = [...new Set(baseSymbols.concat(quoteSymbols))];
        const knownSymbolNames = await this.getKnownSymbolNames();
        const missingSymbols = uniqueSymbols
            .filter(s => !knownSymbolNames.includes(s))
            ;

        metrics.newSymbols = missingSymbols;
        metrics.numSymbols = uniqueSymbols.length;

        // Add any missing symbol definitions in parallel. This may be thousands (on first run)
        const newSymbolPromises: Promise<TradeSymbol>[] = [];
        for (const ms of missingSymbols) {
            const symbolDef = this.deriveTradeSymbolFromCCXT(ms);
            newSymbolPromises.push(this.addSymbol(symbolDef));
        }

        // TODO: Notify on new symbols...might be good to know about new symbols trading
        if (newSymbolPromises.length > 0) {
            log.info(`Adding ${newSymbolPromises.length} symbol(s) to the DB...`);
            const newSymbolDefs = await Promise.all(newSymbolPromises);
            log.info(`Added symbols. Sample: ${missingSymbols.slice(0, 32)}`);
        }

        // ... split up and dispatch work onto the queue

        return metrics;
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
            throw new Error(`Could not definition for symbol '${symbol}' in exchange '${this._exchange.id}'`);
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
     * Adds a new unique trade symbol to the DB, e.g. a cryptocurrency or an equity.
     * Every symbol (including equities) has a base symbol (the asset) and a quote symbol (e.g. BTC, USD, CAD, etc)
     * @param props 
     * @returns 
     */
    async addSymbol(props: Partial<TradeSymbol>): Promise<TradeSymbol> {
        return query(queries.SYMBOLS_ADD, async trx => {
            const [row] = <TradeSymbol[]>await db(tables.TradeSymbols)
                .transacting(trx)
                .insert(props)
                .returning("*")
                ;

            return TradeSymbolEntity.fromRow(row);
        });
    }

    /**
     * Gets prices from either the database, or the specified exchange.
     * @param exchange 
     * @param symbolPair 
     * @param res 
     * @param start 
     * @param end 
     */
    async getPrices(exchange: string, symbolPair: string, res: TimeResolution, start: Date, end: Date = new Date()) {
        // ... compute missing ranges
        // ... break up work
        // ... validate and store new data
        debugger;
    }

    /**
     * Pulls symbol prices from an exchange, optionally adding them to the database.
     * @param exchange 
     * @param symbolPair 
     * @param start 
     * @param end 
     */
    async pullSymbolPrices(exchange: string, symbolPair: string, res: TimeResolution, start: Date, end: Date = new Date(), save = false): Promise<Price[]> {
        const nowMs = this._exchange.milliseconds();
        const startMs = start.getTime();

        // TODO: Date validation for max range
        if (startMs > nowMs) {
            throw new Error(`Invalid start/end dates`);
        }

        const sinceMs = nowMs - startMs;
        const response = await this._exchange.fetchOHLCV(symbolPair, res, sinceMs);

        // Update symbol pricing
        // LEFTOFF
        return [];
    }
}
