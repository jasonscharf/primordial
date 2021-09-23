import { Command } from "commander";
import { DateTime } from "luxon";
import { BotCreateArgs } from "../../../common-backend/commands/bots/create";
import { BotListArgs } from "../../../common-backend/commands/bots/list";
import { BotTestArgs, DEFAULT_BACKTEST_BUDGET_AMOUNT } from "../../../common-backend/commands/bots/test";
import { CommonArgs } from "../../../common-backend/commands/CommonArgs";
import { CommandResult } from "../../../common-backend/commands/CommandResult";
import { PrimoMissingArgumentError } from "../../../common/errors/errors";
import { buildCommandContextForSystemUser, formatResult, handleCommandError, runCommand } from "../cli-utils";
import { capital, cmds, constants, log, sym } from "../../../common-backend/includes";
import { isNullOrUndefined } from "../../../common/utils";
import { randomName } from "../../../common-backend/utils/names";
import { DEFAULT_OUTPUT_TYPE } from "../defaults";


const bot = new Command("bot");
bot
    .command("create")
    .option("-g, --genome <genome>", "Genome to realize")
    .option("-n, --name <name>", "Name of the bot definition and instance to create, i.e. \"rsi-macd-bot-test-01\"")
    .option("-s, --symbols <symbols>", "Symbols to run. If multiple are specified, multiple bot instances will be created.")
    .option("-b, --budget <budget>", "Size of allocation to create, e.g. \"5 BTC\"")
    .option("-m, --max-wager-pct <budget>", "Max size of budget to wager", "0.01")
    .option("-f, --format <format>", "Output format of the command: json, tsv, csv, or yaml", "json")
    .argument("[name]")
    .action(async (name, options, command) => {
        if (name) {
            options.name = name;
        }
        return wrap(() => runCommandBotCreate(options));
    });

bot
    .command("list")
    .option("-f, --format <format>", "Output format of the command: json, tsv, csv, or yaml", "json")
    .action(async (name, options, command) => {
        return wrap(() => runCommandBotList(options));
    });

bot
    .command("start")
    .argument("<name>")
    .action(async (name, options, command) => {
        if (name) {
            options.name = name;
        }
        return wrap(() => runCommandBotStart(options));
    });


bot
    .command("stop")
    .argument("<name>")
    .action(async (name, options, command) => {
        if (name) {
            options.name = name;
        }
        return wrap(() => runCommandBotStop(options));
    });

bot
    .command("test")
    .argument("[name]")
    .option("-f, --from <from>", "When to run the test from")
    .option("-t, --to <to>", "When to run the test to")
    .option("-g, --genome <genome>", "Genome to realize")
    .option("-n, --name <name>", "Name of the bot definition and instance to create, i.e. \"rsi-macd-bot-test-01\"")
    .option("-s, --symbols <symbols>", "Symbols to run. If multiple are specified, multiple bot instances will be created.")
    .option("-b, --budget <budget>", "Size of allocation to create, e.g. \"5 BTC\"")
    .option("-m, --max-wager-pct <budget>", "Max size of budget to wager", "0.01")
    .option("-f, --format <format>", "Output format of the command: json, tsv, csv, or yaml", "json")
    .action(async (name, options, command) => {
        if (name) {
            options.name = name;
        }
        return wrap(() => runCommandBotTest(options));
    });


async function wrap(fn: Function) {
    try {
        return await fn();
    }
    catch (err) {
        log.error(`Error running command`, err);
        process.exit(-1);
    }
}

/**
* Starts a bot. Resumes it if paused or stopped.
* @param options 
*/
export async function runCommandBotStart(options) {
    const { name, format } = options;

    if (!name) {
        throw new PrimoMissingArgumentError(`Please specify the name of the bot to start`);
    }

    const args: CommonArgs = {
        name,
        format,
    };
    return runCommand(constants.commands.CMD_BOTS_START, options);
}

/**
* Stops a bot.
* @param options 
*/
export async function runCommandBotStop(options) {
    const { name, format } = options;

    if (!name) {
        throw new PrimoMissingArgumentError(`Please specify the name of the bot to stop`);
    }

    const args: CommonArgs = {
        name,
        format,
    };
    return runCommand(constants.commands.CMD_BOTS_STOP, options);
}

/**
 * Fetches a list of bots for a given user
 * @param options 
 */
export async function runCommandBotList(options) {
    const { format } = options;
    const args: CommonArgs = {
        format,
    };
    return runCommand(constants.commands.CMD_BOTS_LIST, options);
}

/**
 * Creates a new bot definition and instance
 * @param options
 */
export async function runCommandBotCreate(options) {
    const { alloc, budget, genome, name, format, maxWagerPct, startInstance, symbols } = options;

    if (!alloc && !budget) {
        throw new PrimoMissingArgumentError(`Please specify a budget or pre-existing allocation to attach to`);
    }

    const budgetParsed = await capital.parseAssetAmounts(budget);
    const args: BotCreateArgs = {
        alloc,
        genome,
        budget: budgetParsed,
        maxWagerPct,
        name: isNullOrUndefined(name) ? randomName() : name,
        format: format || DEFAULT_OUTPUT_TYPE,
        symbols,
        startInstance,
    };

    return runCommand(constants.commands.CMD_BOTS_CREATE, args);
}

/**
 * Backtests a bot genome.
 * @param options
 */
export async function runCommandBotTest(options) {
    const { budget, from, genome, name, format, maxWagerPct, remove, symbols, to } = options;

    if (!symbols) {
        throw new Error(`Please specify symbols to backtest`);
    }
    const [base, quote] = sym.parseSymbolPair(symbols);
    const defaultBudget = `${DEFAULT_BACKTEST_BUDGET_AMOUNT} ${quote}`;
    const budgetParsed = await capital.parseAssetAmounts(budget || defaultBudget);
    const fromParsed = from ? DateTime.fromISO(from).toJSDate() : null;
    const toParsed = to ? DateTime.fromISO(to).toJSDate() : null;

    const args: Partial<BotTestArgs> = {
        genome,
        budget: budgetParsed,
        maxWagerPct,
        name: isNullOrUndefined(name) ? randomName() : name,
        format: format || DEFAULT_OUTPUT_TYPE,
        symbols,
        remove,
    };

    if (fromParsed) {
        args.from = fromParsed;
    }
    if (toParsed) {
        args.to = toParsed;
    }
    return runCommand(constants.commands.CMD_BOTS_TEST, args);
}

export { bot }
