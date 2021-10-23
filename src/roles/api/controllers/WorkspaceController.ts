import Koa from "koa";
import { Body, Get, Post, Query, Request, Route } from "tsoa";
import { BotMode } from "../../common/models/system/Strategy";
import { ControllerBase } from "./ControllerBase";
import { PrimoValidationError } from "../../common/errors/errors";
import { strats, sym, users } from "../../common-backend/includes";


@Route("workspaces")
export class WorkspaceController extends ControllerBase {

    @Get("{workspaceId}/strategies/{strategyId}/bots/{status}")
    async getBots(workspaceId: string, strategyId: string, status: string) {
        const user = this.currentSession?.user || null;

        if (!workspaceId) {
            throw new PrimoValidationError(`Missing or malformed workspace reference`, workspaceId);
        }

        if (!strategyId) {
            throw new PrimoValidationError(`Missing or malformed strategy reference`, strategyId);
        }

        if (status !== BotMode.FORWARD_TEST && status !== BotMode.LIVE) {
            throw new PrimoValidationError(`Unknown status '${status}'`, "status");
        }

        // SECURITY: TODO: Call out to security manage to ensure user has access to strategy and that it's part of workspace
        // SECURITY: Add RUID to getBotDescriptors

        // The cast to any here is because `Mode` collides with a builtin Node FS type with the same name, when running tsoa
        const descriptors = await strats.getBotDescriptors(workspaceId, strategyId, status as any);
        return descriptors;
    }

    @Get("{workspaceId}/links")
    async getWorkspaceLinks(workspaceId: string) {
        const user = this.currentSession?.user || null;

        if (!workspaceId) {
            throw new PrimoValidationError(`Missing or malformed workspace reference`, workspaceId);
        }

        const { id: uid } = await users.getSystemUser();
        const symbolPairs = await sym.getActivelyTradingSymbolPairs(uid, workspaceId);
        return symbolPairs;
    }
}
