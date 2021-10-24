import { BuildInfo } from "./BuildInfo";
import { EnvInfo } from "./EnvInfo";
import { User } from "../user/User";


export interface InfoResponse {
    buildInfo?: BuildInfo;
    environment: EnvInfo;

    // These must be null for unauthed users
    user?: User;
    defaultWorkspace?: string;
    defaultStrategy?: string;
}
