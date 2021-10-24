import Koa from "koa";
import { Body, Get, Post, Query, Request, Route } from "tsoa";
import { BotMode } from "../../common/models/system/Strategy";
import { ControllerBase } from "./ControllerBase";
import { GenotypeInstanceDescriptor } from "../../common/models/bots/GenotypeInstanceDescriptor";
import { PrimoValidationError } from "../../common/errors/errors";
import { strats, sym, users } from "../../common-backend/includes";
import { defaults, limits } from "../../common-backend/constants";


@Route("workspaces")
export class WorkspaceController extends ControllerBase {

    @Get("{workspaceId}/strategies/{strategyId}/instances/{status}")
    async getRunningInstances(workspaceId: string, strategyId: string, status: string, @Query() limit?: number): Promise<GenotypeInstanceDescriptor[]> {
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

        if (!limit) {
            limit = defaults.DEFAULT_API_LIST_BACK_TESTS_COUNT;
        }

        if (limit > limits.MAX_API_LIST_BACK_TESTS) {
            throw new PrimoValidationError(`Invalid number of backtests requested`, "limit");
        }

        // SECURITY: TODO: Call out to security manage to ensure user has access to strategy and that it's part of workspace
        // SECURITY: Add RUID to getBotDescriptors

        // The cast to any here is because `Mode` collides with a builtin Node FS type with the same name, when running tsoa
        const descriptors = await strats.getBotDescriptors(workspaceId, strategyId, status as any, { limit });
        return descriptors;
    }

    @Get("{workspaceId}/strategies/{strategyId}/backtests/top")
    async getTopBacktests(workspaceId: string, strategyId: string, @Query() limit?: number): Promise<GenotypeInstanceDescriptor[]> {
        const user = this.currentSession?.user || null;

        if (!workspaceId) {
            throw new PrimoValidationError(`Missing or malformed workspace reference`, "workspaceId");
        }

        if (!strategyId) {
            throw new PrimoValidationError(`Missing or malformed strategy reference`, "strategyId");
        }

        if (!limit) {
            limit = defaults.DEFAULT_API_LIST_BACK_TESTS_COUNT;
        }

        if (limit > limits.MAX_API_LIST_BACK_TESTS) {
            throw new PrimoValidationError(`Invalid number of backtests requested`, "limit");
        }

        // SECURITY
        const { id: ruid } = await users.getSystemUser();

        const descriptors = await strats.getTopPerformingBacktests(ruid, workspaceId, strategyId, { limit });
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
