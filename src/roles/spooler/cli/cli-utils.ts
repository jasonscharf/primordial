import yaml from "js-yaml";
import { Parser, parse, transforms } from "json2csv";
import { CommandContext } from "../../common-backend/commands/CommandContext";
import { CommandResult } from "../../common-backend/commands/CommandResult";
import { cmds, log } from "../../common-backend/includes";
import { randomString } from "../../common/utils";
import { us } from "../../common-backend/services";
import { CommonArgs } from "../../common-backend/commands/CommonArgs";
import { DEFAULT_OUTPUT_TYPE } from "./defaults";


/**
 * Builds a command context for issuing CLI commands as the system user.
 * @param commandName 
 * @param args 
 * @returns 
 */
export async function buildCommandContextForSystemUser<TArgs>(commandName: string, args: TArgs) {
    const currentUser = await us.getSystemUser();
    const commandInvocationId = randomString(16); // TODO: Higher quality random string?
    const ctx: CommandContext<TArgs> = {
        requestingUserId: currentUser.id,
        commandInvocationId,
        commandName,
        currentUser,
        args,
    };

    return ctx;
}


/**
 * Runs a command
 * @param cmdName 
 * @param options 
 * @returns 
 */
 export async function runCommand(cmdName: string, args: CommonArgs) {
    const { format } = args;
    const commonDefaults: Partial<CommonArgs> = {
        format: format || DEFAULT_OUTPUT_TYPE,
    }

    const ctx = await buildCommandContextForSystemUser(cmdName, Object.assign({}, commonDefaults, args));
    let result: CommandResult = null;
    try {
        result = await cmds.execute(cmdName, ctx);
    }
    catch (err) {
        return handleCommandError(ctx, err);
    }

    const output = await formatResult(result, format);
    console.log(output);
    process.exit(0);
}


export async function formatResult(result: CommandResult, format = "json", csvFields = [], useBuffer = false): Promise<string | Buffer> {
    let stringContent = "";
    if (format === "json") {
        stringContent = JSON.stringify(result, null, 4);
    }
    else if (format === "yaml" || format === "yml") {
        stringContent = yaml.dump(result, {});
    }
    else if (format === "csv") {
        const opts = {};
        const parser = new Parser({ fields: result.csvFields });
        const csv = parser.parse(result.output);
        stringContent = csv;
    }
    else {
        throw new Error(`Unknown output format '${format}'`);
    }

    return useBuffer ? Buffer.from(stringContent) : stringContent;
}

export async function handleCommandError(ctx: CommandContext, err: Error) {
    log.error(`Error invoking command '${ctx.commandName}' (${ctx.commandInvocationId})`, err);
    process.exit(-1);
}
