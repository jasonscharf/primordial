import { CommandContext } from "../commands/CommandContext";
import { CommandHandler } from "../commands/CommandHandler";
import { CommandResult } from "../commands/CommandResult";
import { log } from "../includes";

export class CommandService {
    protected _handlers = new Map<string, CommandHandler>();


    /**
     * Registers a handler for a given command name.
     * @param name 
     * @param handler 
     */
    registerHandler(name: string, handler: CommandHandler) {
        if (this._handlers.has(name)) {
            throw new Error(`Command handler '${name}' already exists`);
        }

        this._handlers.set(name, handler);
    }

    /**
     * Returns a command by name.
     * @param name 
     * @returns 
     */
    getHandler<T>(name: string): CommandHandler<T> {
        if (!this._handlers.has(name)) {
            return null;
        }
        else {
            return this._handlers.get(name);
        }
    }

    /**
     * Executes a formal, named command.
     * @param name 
     * @param ctx 
     * @returns 
     */
    async execute<T>(name: string, ctx: CommandContext<T>): Promise<CommandResult> {
        const handler = this.getHandler(name);
        if (!handler) {
            throw new Error(`Unknown command '${name}'`);
        }

        let result: CommandResult<T>;

        const start = Date.now();

        // Just for cleaning up property ording by forward declaring.
        const baseResult = {
            duration: 0,
        }
        result = <CommandResult<T>>await handler.execute(ctx);

        const cleanResult = Object.assign({}, baseResult, result);
        const end = Date.now();
        const duration = end - start;

        cleanResult.duration = duration;

        return cleanResult;
    }
}
