import { BacktestRequest } from "../../common-backend/messages/testing";
import { BotRunner } from "../../common-backend/bots/BotRunner";
import { log } from "../../common-backend/includes";


/**
 * Handles a request to run a backtest.
 * @param args 
 */
export async function handleBacktestCommand(args: BacktestRequest) {
    log.info(`Running backtest '${args.name}' across ${args.from} - ${args.to}`);
    const runner = new BotRunner();
    args.returnEarly = true;
    const results = await runner.run(args);
    return results;
}
