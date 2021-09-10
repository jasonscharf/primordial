import { BotCreate } from "./bots/create";
import { BotList } from "./bots/list";
import { BotStart } from "./bots/start";
import { BotStop } from "./bots/stop";
import { BotTest } from "./bots/test";
import { CommandService } from "../services/CommandService";
import { cmds, constants } from "../includes";


/**
 * Registers implementations for particular commands.
 * Any role that supports command invocation must register handlers.
 * @param service 
 */
export function registerCommandHandlers(service: CommandService = cmds) {
    service.registerHandler(constants.commands.CMD_BOTS_CREATE, new BotCreate());
    service.registerHandler(constants.commands.CMD_BOTS_LIST, new BotList());
    //service.registerHandler(constants.commands.CMD_BOTS_PAUSE, new BotPause());
    service.registerHandler(constants.commands.CMD_BOTS_START, new BotStart());
    service.registerHandler(constants.commands.CMD_BOTS_STOP, new BotStop());
    service.registerHandler(constants.commands.CMD_BOTS_TEST, new BotTest());
}
