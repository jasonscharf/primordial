import { BuildInfo } from "./BuildInfo";
import { EnvInfo } from "./EnvInfo";
import { IUser } from "../user/IUser";


export interface InfoResponse {
    buildInfo?: BuildInfo;
    environment: EnvInfo;
    user: IUser | null;
}
