import { Allocation } from "../../../common/models/capital/Allocation";
import { AssetAmount } from "../../../common/models/capital/AssetAmount";
import { BotDefinition } from "../../../common/models/system/BotDefinition";
import { BotInstanceDescriptor } from "../../../common/models/BotInstanceDescriptor";
import { BotRun } from "../../../common/models/system/BotRun";
import { CommandContext } from "../CommandContext";
import { CommandHandler } from "../CommandHandler";
import { CommandResult } from "../CommandResult";
import { CommonArgs } from "../CommonArgs";
import { CommonBotArgs } from "../CommonArgsBots";
import { PrimoAlreadyExistsError, PrimoMissingArgumentError } from "../../../common/errors/errors";
import { Workspace } from "../../../common/models/system/Workspace";
import { WorkspaceEntity } from "../../../common/entities/WorkspaceEntity";
import { capital, constants, db, strats } from "../../includes";
import { query } from "../../database/utils";
import { randomName } from "../../utils/names";
import { tables } from "../../constants";


export const DEFAULT_COMMAND_ARGS: CommonArgs = {
    name: null,
    format: null,
}


/**
 * Arguments for creating a new bot.
 */
export interface BotCreateArgs extends CommonBotArgs {
    alloc?: string;
    budget: AssetAmount[];
    genome: string;
    startInstance?: boolean;
    symbols?: string;
    maxWagerPct?: number;
}


/**
 * Creates a new bot, either from an existing definition or from a new one.
 */
export class BotCreate implements CommandHandler<BotCreateArgs> {
    get type() { return constants.commands.CMD_BOTS_CREATE }

    /**
     * Executes the command, returning results of its invocation.
     * @param ctx 
     * @returns 
     */
    async execute(ctx: CommandContext<BotCreateArgs>): Promise<CommandResult<BotInstanceDescriptor>> {
        const start = Date.now();
        const newRandomName = randomName();
        const DEFAULT_ARGS: Partial<BotCreateArgs> = {
            displayName: null,
            name: newRandomName,
            alloc: "100 TUSD",
            startInstance: false,
            symbols: null,
            format: "application/json",
        };

        const trx = await db.transaction();

        try {

            // Collect arguments
            const { args } = ctx;
            const { requestingUserId } = ctx;

            const appliedArgs = Object.assign({}, DEFAULT_ARGS, args);
            let { name, genome, format: outputType, startInstance, symbols } = appliedArgs;

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


            // ... arg validation logic re: symbols

            // ... default strat only for now
            // TODO: Move to SS (another temp home...)
            const workspace = await query("temp.get-default-workspace", async db => {
                const [row] = <Workspace[]>await db(tables.Workspaces)
                    .where({ ownerId: requestingUserId })
                    .limit(1)
                    ;

                return WorkspaceEntity.fromRow(row);
            }, trx);

            // Create default strategy if it doesn't exist
            const strat = await strats.getOrCreateDefaultStrategy(workspace.id, requestingUserId, trx);

            // Check if the bot exists
            const existing = await strats.getBotDefinitionByName(workspace.id, name, trx);
            if (existing) {
                throw new PrimoAlreadyExistsError(`Bot definition with name '${name}' already exists`);
            }

            // TODO: Automatic start flag
            const props: Partial<BotDefinition> = {
                name,
                displayName,
            };


            const description = "";
            const workspaceId = workspace.id;
            const DEFAULT_BOT_DEF_PROPS: Partial<BotDefinition> = {
                description,
                genome,
                name,
                symbols,
                workspaceId,
                displayName,
            };

            const appliedProps = Object.assign({}, DEFAULT_BOT_DEF_PROPS, props);
            const def = await strats.addNewBotDefinition(strat.id, appliedProps, trx);
            
            // Attach the allocation, or fail.
            let allocation: Allocation = null;
            if (args.alloc) {
                // TODO ... attach to existing allocation
                throw new Error(`Allocation attachment not implemented yet`);
            }
            else if (args.budget) {
                const ledger = await capital.createAllocationForBot(strat.id, `${args.budget.map(i => `${i.quantity.toString()} ${i.symbol.id}`).join(", ")}`, {
                    name,
                    displayName,
                }, trx);

                allocation = ledger.alloc;
            }
            else {
                throw new PrimoMissingArgumentError(`Please specify a budget for this bot, or attach to an existing one.`);
            }

            const instance = await strats.createNewInstanceFromDef(def, name, allocation.id, startInstance, trx);

            const [updatedInstance, run] = await strats.startBotInstance(instance.id, trx);

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
