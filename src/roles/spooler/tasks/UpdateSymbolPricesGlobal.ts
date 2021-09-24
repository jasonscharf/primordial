import ccxt from "ccxt";
import { DateTime } from "luxon";
import env from "../../common-backend/env";
import { PriceDataRange, UpdateSymbolsState } from "../../common-backend/services/SymbolService";
import { SpoolerTaskHandler } from "../../common-backend/system/SpoolerTaskHandler";
import { TradeSymbol } from "../../common/models/markets/TradeSymbol";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { constants, log, sym } from "../../common-backend/includes";
import { millisecondsPerResInterval, normalizePriceTime, splitRanges } from "../../common/utils/time";
import { limits } from "../../common-backend/constants";


const DEFAULT_STATE: UpdateSymbolsState = {
    filterByBase: null,
    filterByQuote: "BTC",
};

/**
 * Updates prices for the "global symbol watchlist" (GSW) at 1m resolution.
 * @param state 
 * @param progress 
 */
export const updateSymbolPricesGlobal: SpoolerTaskHandler<UpdateSymbolsState> = async (state, progress) => {
    log.debug(`Updating global symbols...`);

    // ... for each exchange

    state = state || DEFAULT_STATE;
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
    const marketsForExchange = await sym.loadMarketDefinitions();
    const markets = Object.keys(marketsForExchange);
    metrics.totalMarkets = markets.length;

    // Apply market filters from state
    const { filterByBase, filterByQuote } = state;
    const filteredMarkets = markets
        .map(k => marketsForExchange[k])


        // NOTE: Symbol filters disabled for now. We pull all symbols defs.
        //.filter(m => filterByBase ? new RegExp(filterByBase).test(m.base) : true)
        //.filter(m => filterByQuote ? new RegExp(filterByQuote).test(m.quote) : true)
        ;
    metrics.filteredMarkets = filteredMarkets.length;

    // Ensure we have definitions for each symbol referenced by our filtered market set.
    const baseSymbols = filteredMarkets.map(m => m.base);
    const quoteSymbols = filteredMarkets.map(m => m.quote);
    const uniqueSymbols = [...new Set(baseSymbols.concat(quoteSymbols))];
    const knownSymbolNames = await sym.getKnownSymbolNames();
    const missingSymbols = uniqueSymbols
        .filter(s => !knownSymbolNames.includes(s))
        ;

    metrics.newSymbols = missingSymbols;
    metrics.numSymbols = uniqueSymbols.length;

    // Add any missing symbol definitions in parallel. This may be thousands (on first run).
    const newSymbolPromises: Promise<TradeSymbol>[] = [];
    for (const ms of missingSymbols) {
        try {
            const symbolDef = sym.deriveTradeSymbolFromCCXT(ms);
            newSymbolPromises.push(sym.addSymbol(symbolDef));
        }
        catch (err) {
            log.error(`Could not update symbol '${ms}'`, err);
        }
    }

    // TODO: Notify on new symbols...might be good to know about new symbols trading
    if (newSymbolPromises.length > 0) {
        log.info(`Adding ${newSymbolPromises.length} symbol(s) to the DB...`);
        const newSymbolDefs = await Promise.all(newSymbolPromises);
        log.info(`Added symbols. Sample: ${missingSymbols.slice(0, 32)}`);
    }

    // ... compute all symbols to sync
    const symbolPairsToUpdate = await sym.getGlobalWatchlistSymbolPairs();

    // For each symbol, compute missing ranges
    // Take the first missing range, constrain it to fit within API request limits, e.g. max 500
    const res = TimeResolution.ONE_MINUTE;

    // TODO: Defaults/constants
    const start = DateTime.fromISO("2021-01-01", { zone: "America/Vancouver" }).toJSDate();


    // Deal with specific gaps in Binance data. #exchange
    function shouldInclude(range: PriceDataRange) {
        // See: https://www.binance.com/en/support/announcement/849160fe70214641baa6385619595aa1 for likely explanation
        return !(range.start.toISOString() === "2021-04-25T04:01:00.000Z" && range.end.toISOString() === "2021-04-25T08:44:59.999Z");
    }

    const syncRangesForSymbols = new Map<string, PriceDataRange[]>();

    for (const pair of symbolPairsToUpdate) {
        const splits: PriceDataRange[] = [];

        // Only pull up the current interval.
        const end = normalizePriceTime(res, new Date());

        const missingRanges = await sym.getMissingRanges(exchange, pair, res, start, end);
        if (missingRanges.length === 0) {
            log.debug(`[${updateSymbolPricesGlobal.name}] Data for '${pair}' is up to date @ ${res}`);
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

    const maxRequestsPerHandler = 10;
    ops.splice(maxRequestsPerHandler);

    console.log(`[SYNC]: Running ${ops.length} sync operations`);

    // Update the top N operations for this handler duration
    for (const op of ops) {
        const { end, exchange, start, symbolPair } = op;

        log.debug(`[SYNC] UPDATE '${symbolPair}' from ${start.toISOString()} to ${end.toISOString()}`);
        const update = await sym.updateSymbolPrices(exchange, symbolPair, res, start, end);

        //log.debug(`[SYNC] Fetched ${update.length} prices for [${symbolPair}] at resolution ${res}`);
    }

    return metrics;
};
