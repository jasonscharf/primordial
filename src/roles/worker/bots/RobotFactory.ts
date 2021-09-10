import { Factory } from "../../common-backend/bots/BotFactory";
import { GeneticBot } from "./GeneticBot";
import { DEFAULT_BOT_IMPL } from "../../common-backend/genetics/base-genetics";


const botFactory = new Factory();
botFactory.register(DEFAULT_BOT_IMPL, args => new GeneticBot());

export { botFactory }
