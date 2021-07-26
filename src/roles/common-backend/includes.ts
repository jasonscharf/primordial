import { ConsoleLogger } from "../common/utils/ConsoleLogger";
import { Logger } from "../common/utils/Logger";
import { databaseManager } from "./db";

const dbm = databaseManager;
const db = databaseManager.db;
const log: Logger = new ConsoleLogger();

export { db, dbm, log };
