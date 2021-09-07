import { AssetAmount } from "../../../common/models/capital/AssetAmount";
import { BacktestRequest } from "../../messages/testing";
import { CommandContext } from "../CommandContext";
import { CommandHandler } from "../CommandHandler";
import { CommandResult } from "../CommandResult";
import { CommonArgs } from "../CommonArgs";
import { CommonBotArgs } from "../CommonArgsBots";
import { Workspace } from "../../../common/models/system/Workspace";
import { WorkspaceEntity } from "../../../common/entities/WorkspaceEntity";
import { constants, db, mq, strats } from "../../includes";
import { query } from "../../database/utils";
import { randomName } from "../../utils/names";
import { tables } from "../../constants";
import { Money } from "../../../common/numbers";


// Default backtest length is 2 weeks.
export const DEFAULT_BACKTEST_LENGTH = 1000 * 60 * 60 * 24 * 14;
export const DEFAULT_BACKTEST_BUDGET_AMOUNT = 10000;
export const DEFAULT_BACKTEST_ARGS: Partial<BotTestArgs> = {
    remove: false,
    from: new Date(Date.now() - DEFAULT_BACKTEST_LENGTH),
    to: new Date(Date.now()),
    genome: "TIME-RES=1m",
    maxWagerPct: 0.01,
    format: "application/json",
};

/**
 * Arguments for running a backtest.
 */
export interface BotTestArgs extends BacktestRequest {
    format: string;
    name: string;
    displayName?: string;
}


/**
 * Runs a backtest for a particular bot
 */
export class BotTest<TResultType> implements CommandHandler<BotTestArgs> {

    /**
     * Executes the command, returning results of its invocation.
     * @param ctx 
     * @returns 
     */
    async execute(ctx: CommandContext<BotTestArgs>): Promise<CommandResult<TResultType>> { 
        const start = Date.now();
        const trx = await db.transaction();

        // Collect arguments
        const { args } = ctx;
        const { requestingUserId } = ctx;

        const appliedArgs = Object.assign({}, DEFAULT_BACKTEST_ARGS, args);

        let { name, from, genome, format: outputType, remove, symbols, to } = appliedArgs;

        if (!name) {
            name = randomName();
        }

        let displayName = appliedArgs.displayName || name;

        if (!genome) {
            throw new Error(`Missing argument 'genome'`);
        }

        if (!symbols) {
            throw new Error(`Missing argument 'symbols'`);
        }

        const output = await mq.executeWorkerCommand<TResultType>(constants.commands.CMD_BOTS_TEST, appliedArgs) as TResultType;


        await trx.commit();

        const end = Date.now();
        const duration = end - start;
        const result: CommandResult<TResultType> = {
            success: true,
            invocationId: ctx.commandInvocationId,
            mimeType: outputType,
            output,
            duration,
        };

        return result;
    }
}
