import { Command } from "commander";
import env from "../common-backend/env";
import { alloc, bot } from "./cli/commands";
import { banner } from "./cli/banner";
import { mq } from "../common-backend/includes";
import { registerCommandHandlers } from "../common-backend/commands/command-handlers";
import { version } from "../common/version";

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

mq.connectAsPublisher(true).then(() => {
    program.parse(process.argv);
})
    .catch(err => {
        console.error(err);
        process.exit(-1);
    });
