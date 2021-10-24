import Koa from "koa";
import { Body, Get, Post, Query, Request, Route } from "tsoa";
import { BotMode } from "../../common/models/system/Strategy";
import { ControllerBase } from "./ControllerBase";
import { PrimoValidationError } from "../../common/errors/errors";
import { strats, sym, users } from "../../common-backend/includes";


@Route("genotypes")
export class GenotypeController extends ControllerBase {

}
