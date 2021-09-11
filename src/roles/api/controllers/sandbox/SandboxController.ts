import Koa from "koa";
import env from "../../../common-backend/env";
import { Get, Request, Route } from "tsoa";
import { BotResultsSummary } from "../../../common-backend/bots/BotSummaryResults";
import { BuildInfo, EnvInfo, InfoResponse } from "../../../common/api";
import { ControllerBase } from "../ControllerBase";
import { version } from "../../../common/version";
import { capital, orders, results, strats } from "../../../common-backend/includes";


@Route("sandbox")
export class Sandbox extends ControllerBase {

    @Get("/results/{instanceId}")
    async getBotResults(instanceId: string): Promise<any> {
        const user = this.currentSession?.user || null;

        const instance = await strats.getBotInstanceById(instanceId);
        const run = await strats.getLatestRunForInstance(instanceId);

        if (!run) {
            throw new Error(`Bot hasn't run yet`);
        }

        debugger;
        const res = await results.getLatestResultsForBot(instanceId);

        return res;
    }
}
