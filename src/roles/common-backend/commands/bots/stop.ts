import { BotInstanceDescriptor } from "../../../common/models/BotInstanceDescriptor";
import { CommandContext } from "../CommandContext";
import { CommandHandler } from "../CommandHandler";
import { CommandResult } from "../CommandResult";
import { CommonBotArgs } from "../CommonArgsBots";
import { constants, db, strats } from "../../includes";
import { Knex } from "knex";


export const DEFAULT_COMMAND_ARGS: BotStopArgs = {
    name: null,
    format: null,
}


/**
 * Arguments for stopping a bot.
 */
export interface BotStopArgs extends CommonBotArgs {
}


/**
 * Creates a new bot, either from an existing definition or from a new one.
 */
export class BotStop implements CommandHandler<BotStopArgs> {
    async execute(ctx: CommandContext<BotStopArgs>): Promise<CommandResult<BotInstanceDescriptor>> {
        const start = Date.now();
        const DEFAULT_ARGS: Partial<BotStopArgs> = {
        };


        let trx: Knex.Transaction;
        try {
            trx = await db.transaction();

            // Collect arguments
            const { args } = ctx;
            const { requestingUserId } = ctx;

            const appliedArgs = Object.assign({}, DEFAULT_ARGS, args);
            let { name, format: outputType } = appliedArgs;

            const workspace = await strats.getDefaultWorkspaceForUser(requestingUserId, requestingUserId, trx);
            const strat = await strats.getOrCreateDefaultStrategy(workspace.id, requestingUserId, trx);
            const instance = await strats.getBotInstanceByName(workspace.id, name, trx);
            const def = await strats.getBotDefinitionById(workspace.id, instance.definitionId, trx);
            const [updatedInstance, run] = await strats.stopBotInstance(instance.id, trx);

            await trx.commit();

            const desc: BotInstanceDescriptor = {
                def,
                instance: updatedInstance,
                run,
            };

            const end = Date.now();
            const duration = end - start;
            const result: CommandResult<BotInstanceDescriptor> = {
                success: true,
                invocationId: ctx.commandInvocationId,
                mimeType: outputType,
                output: desc,
                duration,
            };

            return result;
        }
        catch (err) {
            await trx.rollback();
            throw err;
        }
    }
}
