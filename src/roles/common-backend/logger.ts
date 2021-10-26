import { Logger } from "../common/utils/Logger";
import { StderrConsoleLogger } from "../common/utils/StderrConsoleLogger";

export const log: Logger = new StderrConsoleLogger();
