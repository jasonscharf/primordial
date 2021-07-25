import Koa from "koa";
import { Get, Request, Route } from "tsoa";
import { BuildInfo, EnvInfo, InfoResponse } from "../../common/api";
import { ControllerBase } from "./ControllerBase";
import { version } from "../../common/version";
import env from "../../common-backend/env";


@Route("info")
export class InfoController extends ControllerBase {

    @Get()
    getInfo(@Request() req: Koa.Request): Promise<InfoResponse> {
        const user = this.currentSession?.user || null;

        const buildInfo: BuildInfo = {
            version: version.full,
            hash: version.hash.substr(0, 8),
        };

        const environment: EnvInfo = {
            mode: env.PRIMO_MODE,
        };

        const info: InfoResponse = {
            user,
            buildInfo,
            environment,
        };

        return Promise.resolve(info);
    }
}
