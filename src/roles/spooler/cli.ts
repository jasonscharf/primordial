import { Command } from "commander";
import { alloc, bot } from "./cli/commands";
import { banner } from "./cli/banner";
import { registerCommandHandlers } from "../common-backend/commands/command-handlers";
import { version } from "../common/version";
import env from "../common-backend/env";

registerCommandHandlers();


const program = new Command()
    .version(version.full)
    //.enablePositionalOptions()
    //.option("-f, --format <format>", "Output format of the command: json, tsv, csv, or yaml", "json")
    ;

// Show banner
if (process.argv.length <= 2) {
    banner();
}

// Commands
program.addCommand(alloc);
program.addCommand(bot);


program.parse(process.argv);
