import ccxt from "ccxt";
import env from "../../common-backend/env";
import { SpoolerTaskHandler } from "../../common-backend/system/SpoolerTaskHandler";
import { SymbolService, UpdateSymbolsState } from "../../common-backend/services/SymbolService";
import { log, sym } from "../../common-backend/includes";


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

    const metrics = await sym.updateGlobalSymbolPrices(state || DEFAULT_STATE);
    return metrics;
};
