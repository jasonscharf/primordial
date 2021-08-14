import { SpoolerTaskHandler } from "../../common-backend/system/SpoolerTaskHandler";
import { log, sym } from "../../common-backend/includes";
import env from "../../common-backend/env";


/**
 * Updates the global symbol watchlist with minute-level data.
 * @param state 
 * @param progress 
 */
export const updateMarketDefs: SpoolerTaskHandler = async (state, progress) => {

    // ... for each exchange
    const markets = await sym.loadMarketDefinitions(env.PRIMO_DEFAULT_EXCHANGE);

    return state;
};
