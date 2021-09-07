import { CacheService } from "./services/CacheService";
import { CapitalService } from "./services/CapitalService";
import { CommandService } from "./services/CommandService";
import { ConsoleLogger } from "../common/utils/ConsoleLogger";
import { Logger } from "../common/utils/Logger";
import { OrderService } from "./services/OrderService";
import { Pubsub } from "../common/eventing/Pubsub";
import { QueueService } from "./services/QueueService";
import { SpoolerService } from "./services/SpoolerService";
import { StderrConsoleLogger } from "../common/utils/StderrConsoleLogger";
import { StrategyService } from "./services/StrategyService";
import { UserService } from "./services/UserService";
import { databaseManager } from "./db";
import { tables } from "./constants";


const cache = new CacheService();
const capital = new CapitalService();
const cmds = new CommandService();
const tasks = new SpoolerService();
const dbm = databaseManager;
const db = databaseManager.db;
const log: Logger = new StderrConsoleLogger();
const orders = new OrderService();
const pubsub = new Pubsub();
const mq = new QueueService();
const users = new UserService();
const strats = new StrategyService();

export { cache, capital, cmds, db, dbm, log, mq, orders, pubsub, tables, tasks, strats, users }

export * as constants from "./constants";
export * from "./services";
