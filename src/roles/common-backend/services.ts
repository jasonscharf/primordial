import { SpoolerService } from "./services/SpoolerService";
import { SymbolService } from "./services/SymbolService";
import { UserService } from "./services/UserService";


// Global service instances
const us = new UserService();
const sym = new SymbolService();
const spooler = new SpoolerService();

export { spooler, sym, us }
