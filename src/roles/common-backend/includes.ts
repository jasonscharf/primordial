import { ConsoleLogger } from "../common/utils/ConsoleLogger";
import { Logger } from "../common/utils/Logger";
import { Pubsub } from "../common/eventing/Pubsub";
import { databaseManager } from "./db";

const dbm = databaseManager;
const db = databaseManager.db;
const log: Logger = new ConsoleLogger();
const pubsub = new Pubsub();

export { db, dbm, log };
