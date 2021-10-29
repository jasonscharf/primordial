import { Knex } from "knex";
import Koa from "koa";
import { ApiForkGenotypeRequest, ApiForkGenotypeResponse } from "../../common/messages";
import { Body, Get, Post, Query, Request, Route } from "tsoa";
import { BotMode } from "../../common/models/system/Strategy";
import { BotType } from "../../common/models/bots/BotType";
import { ControllerBase } from "./ControllerBase";
import { GenotypeForkArgs } from "../../common-backend/services/GenotypeService";
import { MutationSetType } from "../../common/models/genetics/MutationSetType";
import { PrimoSerializableError, PrimoValidationError } from "../../common/errors/errors";
import { genos, strats, sym, users } from "../../common-backend/includes";
import * as validate from "../../common-backend/validation";


@Route("genotypes")
export class GenotypeController extends ControllerBase {


    // Return type is ApiForkGenotypeResponse
    @Post("/fork/back-to-fwd")
    async forkBacktestToForwardTest(@Body() req: ApiForkGenotypeRequest): Promise<unknown> {
        const { allocationId,
            displayName,
            maxWagerPct,
            modeId,
            mutations,
            parentId,
            res,
            strategyId,
            symbolPairs: symbols,
            typeId: typeId, workspaceId
        } = req as ApiForkGenotypeRequest;

        // SECURITY: TODO: Enforce secret cookie here for alpha

        validate.workspaceId(workspaceId);
        validate.strategyId(strategyId);
        validate.isUuid(allocationId);
        validate.isUuid(parentId);
        validate.isArray(mutations, "mutations");
        validate.column(typeId, BotType.DESCENDANT, [BotType.DESCENDANT, BotType.PAPER_CLONE]);

        const parentInstance = await strats.getBotInstanceById(parentId);
        if (!parentInstance) {
            throw new PrimoSerializableError(`Could not find parent instance with ID '${parentId}'`);
        }

        // TODO: IMPORTANT: Check the allocation... it must be live for live bots
        // Also, backtest->forward test forks

        const args: GenotypeForkArgs = {
            allocationId,
            workspaceId,
            strategyId,
            parentId: parentInstance.id,
            modeId,
            typeId,
            mutations,
            symbolPairs: symbols,
            res,
            system: false,
        };

        // SECURITY
        const user = await users.getSystemUser();

        const result = await genos.fork(user.id, args);
        return result;
    }
}
