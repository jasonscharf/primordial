import { CacheService } from "./services/CacheService";
import { ConsoleLogger } from "../common/utils/ConsoleLogger";
import { Logger } from "../common/utils/Logger";
import { Pubsub } from "../common/eventing/Pubsub";
import { SpoolerService } from "./services/SpoolerService";
import { databaseManager } from "./db";
import { tables } from "./constants";


const cache = new CacheService();
const tasks = new SpoolerService();
const dbm = databaseManager;
const db = databaseManager.db;
const log: Logger = new ConsoleLogger();
const pubsub = new Pubsub();

export * as constants from "./constants";
export * from "./services";
export { cache, db, dbm, log, pubsub, tables, tasks };
