import { CacheService } from "./services/CacheService";
import { CapitalService } from "./services/CapitalService";
import { CommandService } from "./services/CommandService";
import { ConsoleLogger } from "../common/utils/ConsoleLogger";
import { GenotypeService } from "./services/GenotypeService";
import { Logger } from "../common/utils/Logger";
import { OrderService } from "./services/OrderService";
import { Pubsub } from "../common/eventing/Pubsub";
import { QueueService } from "./services/QueueService";
import { ResultsService } from "./services/ResultsService";
import { SpoolerService } from "./services/SpoolerService";
import { StderrConsoleLogger } from "../common/utils/StderrConsoleLogger";
import { StrategyService } from "./services/StrategyService";
import { UserService } from "./services/UserService";
import { databaseManager } from "./db";
import { log } from "./logger";
import { tables } from "./constants";


const cache = new CacheService();
const capital = new CapitalService();
const cmds = new CommandService();
const db = databaseManager.db;
const dbm = databaseManager;
const genos = new GenotypeService();
const mq = new QueueService();
const orders = new OrderService();
const pubsub = new Pubsub();
const results = new ResultsService();
const strats = new StrategyService();
const tasks = new SpoolerService();
const users = new UserService();

export {
    cache,
    capital,
    cmds,
    db,
    dbm,
    genos,
    log,
    mq,
    orders,
    pubsub,
    results,
    tables,
    tasks,
    strats,
    users,
}

export * as constants from "./constants";
export * from "./services";
