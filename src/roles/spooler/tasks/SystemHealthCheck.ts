import { SpoolerTaskHandler } from "../../common-backend/system/SpoolerTaskHandler";
import { log } from "../../common-backend/includes";


/**
 * Does a health check on the application status.
 * @param state 
 * @param progress 
 */
export const systemHealthCheck: SpoolerTaskHandler = async (state, progress) => {
    log.debug(`Running system health check...`);

    // ... ask workers for their status
    // ... report on any errors in an error queue
    // ... gather basic metrics

    // NOTE: Everything in here and in all spooler tasks must run _quick_!
    // ... delegate to workers, aggregate results in a separate event handler

    //log.debug(`System OK`);
};
