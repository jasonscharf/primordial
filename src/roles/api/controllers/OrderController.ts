import Koa from "koa";
import { Body, Get, Post, Query, Request, Route } from "tsoa";
import { ControllerBase } from "./ControllerBase";
import { OrderServiceGetOrderOptions } from "../../common-backend/services/OrderService";
import { PrimoValidationError } from "../../common/errors/errors";
import { orders, strats, sym, users } from "../../common-backend/includes";


@Route("orders")
export class OrderController extends ControllerBase {

    @Get("{workspaceId}/strategies/{strategyId}/orders")
    async getBotOrderDescriptors(workspaceId: string, strategyId: string) {
        const user = this.currentSession?.user || null;

        // SECURITY
        const { id: uid } = await users.getSystemUser();

        if (!workspaceId) {
            throw new PrimoValidationError(`Missing or malformed workspace reference`, workspaceId);
        }

        if (!strategyId) {
            throw new PrimoValidationError(`Missing or malformed strategy reference`, strategyId);
        }

        // SECURITY: TODO: Call out to security manage to ensure user has access to strategy and that it's part of workspace

        const options: Partial<OrderServiceGetOrderOptions> = {
        };
        const descriptors = await orders.getBotOrderDescriptors(uid, workspaceId, strategyId, options);
        return descriptors;
    }
}
