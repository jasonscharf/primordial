import { CommandContext } from "../CommandContext";
import { CommandHandler } from "../CommandHandler";
import { CommandResult } from "../CommandResult";
import { CommonArgs } from "../CommonArgs";
import { CommonBotArgs } from "../CommonArgsBots";
import { Workspace } from "../../../common/models/system/Workspace";
import { WorkspaceEntity } from "../../../common/entities/WorkspaceEntity";
import { constants, db, strats } from "../../includes";
import { query } from "../../database/utils";
import { randomName } from "../../utils/names";
import { tables } from "../../constants";
import { Money } from "../../../common/numbers";


export const DEFAULT_COMMAND_ARGS: CommonArgs = {
    name: null,
    format: null,
}


/**
 * Arguments for creating a new bot.
 */
export interface SomeCommandArgs extends CommonArgs {
}


/**
 * Stub
 */
export class SkeletonCommand<TResultType> implements CommandHandler<SomeCommandArgs> {

    /**
     * Executes the command, returning results of its invocation.
     * @param ctx 
     * @returns 
     */
    async execute(ctx: CommandContext<SomeCommandArgs>): Promise<CommandResult<TResultType>> {
        const start = Date.now();
        const DEFAULT_ARGS: Partial<SomeCommandArgs> = {
            format: "application/json",
        };

        const trx = await db.transaction();

        // Collect arguments
        const { args } = ctx;
        const { requestingUserId } = ctx;

        const appliedArgs = Object.assign({}, DEFAULT_ARGS, args);
        const { format: outputType } = appliedArgs;

        let displayName = appliedArgs.displayName || name;

        const output = null;

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
