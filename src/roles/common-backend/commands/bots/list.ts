import { BotInstanceDescriptor } from "../../../common/models/BotInstanceDescriptor";
import { CommandContext } from "../CommandContext";
import { CommandHandler } from "../CommandHandler";
import { CommandResult } from "../CommandResult";
import { CommonArgs } from "../CommonArgs";
import { constants, db, strats } from "../../includes";
import { query } from "../../database/utils";
import { randomName } from "../../utils/names";
import { tables } from "../../constants";
import { Money } from "../../../common/numbers";


export const DEFAULT_COMMAND_ARGS: CommonArgs = {
    name: null,
    format: null,
}


export interface BotListArgs extends CommonArgs {
}


/**
 * Lists a users bots.
 */
export class BotList implements CommandHandler<BotListArgs> {
    get type() { return constants.commands.CMD_BOTS_LIST; }

    /**
     * Executes the command, returning results of its invocation.
     * @param ctx 
     * @returns 
     */
    async execute(ctx: CommandContext<BotListArgs>): Promise<CommandResult<BotInstanceDescriptor[]>> {
        const DEFAULT_ARGS: Partial<BotListArgs> = {
            format: "application/json",
        };

        const { args } = ctx;
        const { requestingUserId } = ctx;

        const appliedArgs = Object.assign({}, DEFAULT_ARGS, args);
        const { format: outputType } = appliedArgs;


        const trx = await db.transaction();
        const workspace = await strats.getDefaultWorkspaceForUser(requestingUserId, requestingUserId, trx);
        const strat = await strats.getOrCreateDefaultStrategy(workspace.id, requestingUserId, trx);
        const output = await strats.getBots(workspace.id, strat.id);

        const csvFields = [
            "def.name",
            "instance.name",
            "instance.runState",
            "instance.modeId",
            "instance.id",
            "def.id",
            "run.id",
            "run.created",
            "run.updated",
            "run.active",
        ];

        await trx.commit();

        const result: CommandResult<BotInstanceDescriptor[]> = {
            success: true,
            invocationId: ctx.commandInvocationId,
            mimeType: outputType,
            csvFields,
            output,
        };

        return result;
    }
}
