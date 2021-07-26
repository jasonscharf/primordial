import { Container } from "typescript-ioc";
import { DatabaseManager } from "./database/DatabaseManager";


const databaseManager = Container.get(DatabaseManager);
export { databaseManager }
