import { CommandContext } from "./CommandContext";
import { CommandResult } from "./CommandResult";


/**
 * Represents a handler for some given command type.
 */
export interface CommandHandler<TArgs = unknown, TOutput = unknown> {
    execute(ctx: CommandContext<TArgs>): Promise<TOutput>;
}
