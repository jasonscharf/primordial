import Koa from "koa";
import { Get, Request, Route } from "tsoa";
import { BuildInfo, EnvInfo, InfoResponse } from "../../common/api";
import { ControllerBase } from "./ControllerBase";
import { version } from "../../common/version";
import env from "../../common-backend/env";
import { strats, users } from "../../common-backend/includes";


@Route("info")
export class InfoController extends ControllerBase {

    @Get()
    async getInfo(@Request() req: Koa.Request): Promise<InfoResponse> {
        const user = this.currentSession?.user || null;

        const buildInfo: BuildInfo = {
            version: version.full,
            hash: version.hash.substr(0, 8),
        };

        const environment: EnvInfo = {
            mode: env.PRIMO_MODE,
        };

        const { id: uid } = await users.getSystemUser();

        let defaultWorkspace: string = null;
        let defaultStrategy: string = null;

        const workspace = await strats.getDefaultWorkspaceForUser(uid, uid);
        const strategy = await strats.getOrCreateDefaultStrategy(workspace.id, uid);

        const info: InfoResponse = {
            user,
            buildInfo,
            environment,
            defaultWorkspace: workspace.id,
            defaultStrategy: strategy.id,
        };

        return Promise.resolve(info);
    }
}
