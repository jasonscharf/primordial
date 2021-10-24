/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  import { Controller, ValidationService, FieldErrors, ValidateError, TsoaRoute, HttpStatusCodeLiteral, TsoaResponse } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { GenotypeController } from './controllers/GenotypeContoller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { InfoController } from './controllers/InfoController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { OrderController } from './controllers/OrderController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SandboxController } from './controllers/sandbox/SandboxController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { WorkspaceController } from './controllers/WorkspaceController';
import * as KoaRouter from '@koa/router';

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "BuildInfo": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"string","required":true},
            "hash": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EnvInfo": {
        "dataType": "refObject",
        "properties": {
            "mode": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "User": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "created": {"dataType":"datetime","required":true},
            "updated": {"dataType":"datetime","required":true},
            "displayName": {"dataType":"string"},
            "nameFirst": {"dataType":"string","required":true},
            "nameMiddle": {"dataType":"string","required":true},
            "nameLast": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InfoResponse": {
        "dataType": "refObject",
        "properties": {
            "buildInfo": {"ref":"BuildInfo"},
            "environment": {"ref":"EnvInfo","required":true},
            "user": {"ref":"User"},
            "defaultWorkspace": {"dataType":"string"},
            "defaultStrategy": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Partial_BotDefinition_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"workspaceId":{"dataType":"string"},"name":{"dataType":"string"},"symbols":{"dataType":"string"},"genome":{"dataType":"string"},"description":{"dataType":"string"},"id":{"dataType":"string"},"created":{"dataType":"datetime"},"updated":{"dataType":"datetime"},"displayName":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BotMode": {
        "dataType": "refEnum",
        "enums": ["test-back","test-forward","live","test-live","paused"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TimeResolution": {
        "dataType": "refEnum",
        "enums": ["1s","2s","1m","5m","15m","1h","1d","1w"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RunState": {
        "dataType": "refEnum",
        "enums": ["new","initializing","active","paused","stopped","error"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BotInstanceStateInternal": {
        "dataType": "refObject",
        "properties": {
            "baseSymbolId": {"dataType":"string","required":true},
            "quoteSymbolId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GeneticBotFsmState": {
        "dataType": "refEnum",
        "enums": ["wait-for-buy-opp","wait-for-sell-opp","wait-for-buy-order-conf","wait-for-sell-order-conf","sell-surf","buy-surf"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BigNum": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GeneticBotState": {
        "dataType": "refObject",
        "properties": {
            "fsmState": {"ref":"GeneticBotFsmState","required":true},
            "prevFsmState": {"ref":"GeneticBotFsmState","required":true},
            "prevFsmStateChangeTs": {"dataType":"datetime","required":true},
            "signals": {"dataType":"array","array":{"dataType":"double"},"required":true},
            "prevQuantity": {"ref":"BigNum","required":true},
            "prevPrice": {"ref":"BigNum","required":true},
            "prevOrderId": {"dataType":"string","required":true},
            "stopLossPrice": {"ref":"BigNum","required":true},
            "targetPrice": {"ref":"BigNum","required":true},
            "verbose": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BotInstance": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "created": {"dataType":"datetime","required":true},
            "updated": {"dataType":"datetime","required":true},
            "displayName": {"dataType":"string"},
            "allocationId": {"dataType":"string","required":true},
            "definitionId": {"dataType":"string","required":true},
            "exchangeId": {"dataType":"string","required":true},
            "modeId": {"ref":"BotMode","required":true},
            "resId": {"ref":"TimeResolution","required":true},
            "typeId": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "type": {"dataType":"string","required":true},
            "build": {"dataType":"string","required":true},
            "prevTick": {"dataType":"datetime","required":true},
            "symbols": {"dataType":"string","required":true},
            "currentGenome": {"dataType":"string"},
            "normalizedGenome": {"dataType":"string"},
            "runState": {"ref":"RunState","required":true},
            "stateInternal": {"ref":"BotInstanceStateInternal","required":true},
            "stateJson": {"ref":"GeneticBotState","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Partial_BotInstance_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"allocationId":{"dataType":"string"},"definitionId":{"dataType":"string"},"exchangeId":{"dataType":"string"},"modeId":{"ref":"BotMode"},"resId":{"ref":"TimeResolution"},"typeId":{"dataType":"string"},"name":{"dataType":"string"},"type":{"dataType":"string"},"build":{"dataType":"string"},"prevTick":{"dataType":"datetime"},"symbols":{"dataType":"string"},"currentGenome":{"dataType":"string"},"normalizedGenome":{"dataType":"string"},"runState":{"ref":"RunState"},"stateInternal":{"ref":"BotInstanceStateInternal"},"stateJson":{"ref":"BotInstance"},"id":{"dataType":"string"},"created":{"dataType":"datetime"},"updated":{"dataType":"datetime"},"displayName":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Partial_BotRun_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"instanceId":{"dataType":"string"},"active":{"dataType":"boolean"},"from":{"dataType":"datetime"},"to":{"dataType":"datetime"},"id":{"dataType":"string"},"created":{"dataType":"datetime"},"updated":{"dataType":"datetime"},"displayName":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrderState": {
        "dataType": "refEnum",
        "enums": ["open","filling","cancelled","closed","error"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrderType": {
        "dataType": "refEnum",
        "enums": ["buy.limit","sell.limit","buy.market","sell.market"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Partial_Order_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"botRunId":{"dataType":"string"},"baseSymbolId":{"dataType":"string"},"quoteSymbolId":{"dataType":"string"},"exchangeId":{"dataType":"string"},"stopLossOrderId":{"dataType":"string"},"relatedOrderId":{"dataType":"string"},"extOrderId":{"dataType":"string"},"stateId":{"ref":"OrderState"},"typeId":{"ref":"OrderType"},"opened":{"dataType":"datetime"},"closed":{"dataType":"datetime"},"quantity":{"ref":"BigNum"},"price":{"ref":"BigNum"},"gross":{"ref":"BigNum"},"fees":{"ref":"BigNum"},"strike":{"ref":"BigNum"},"limit":{"ref":"BigNum"},"stop":{"ref":"BigNum"},"id":{"dataType":"string"},"created":{"dataType":"datetime"},"updated":{"dataType":"datetime"},"displayName":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiBotOrderDescriptor": {
        "dataType": "refObject",
        "properties": {
            "def": {"ref":"Partial_BotDefinition_","required":true},
            "instance": {"ref":"Partial_BotInstance_","required":true},
            "run": {"ref":"Partial_BotRun_","required":true},
            "order": {"ref":"Partial_Order_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiTimeResolution": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["5m"]},{"dataType":"enum","enums":["15m"]},{"dataType":"enum","enums":["1h"]},{"dataType":"enum","enums":["4h"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiBacktestRequest": {
        "dataType": "refObject",
        "properties": {
            "from": {"dataType":"string","required":true},
            "to": {"dataType":"string","required":true},
            "genome": {"dataType":"string","required":true},
            "res": {"ref":"ApiTimeResolution","required":true},
            "symbols": {"dataType":"string","required":true},
            "maxWagerPct": {"dataType":"double"},
            "remove": {"dataType":"boolean"},
            "name": {"dataType":"string"},
            "returnEarly": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GenotypeInstanceDescriptor": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "created": {"dataType":"datetime","required":true},
            "updated": {"dataType":"datetime","required":true},
            "displayName": {"dataType":"string"},
            "name": {"dataType":"string","required":true},
            "symbols": {"dataType":"string","required":true},
            "resId": {"ref":"ApiTimeResolution","required":true},
            "baseSymbolId": {"dataType":"string","required":true},
            "quoteSymbolId": {"dataType":"string","required":true},
            "modeId": {"ref":"BotMode","required":true},
            "genome": {"dataType":"string","required":true},
            "fsmState": {"ref":"GeneticBotFsmState","required":true},
            "from": {"dataType":"datetime"},
            "to": {"dataType":"datetime"},
            "duration": {"dataType":"object","required":true},
            "numOrders": {"dataType":"double","required":true},
            "totalProfit": {"ref":"BigNum","required":true},
            "totalFees": {"ref":"BigNum","required":true},
            "avgProfitPerDay": {"ref":"BigNum","required":true},
            "avgProfitPctPerDay": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "QueryOrderDirection": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["ASC"]},{"dataType":"enum","enums":["DESC"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const validationService = new ValidationService(models);

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

export function RegisterRoutes(router: KoaRouter) {
    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################
        router.get('/api/info',
            async function InfoController_getInfo(context: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
            };

            let validatedArgs: any[] = [];
            try {
              validatedArgs = getValidatedArgs(args, context, next);
            } catch (error) {
              context.status = error.status;
              context.throw(error.status, JSON.stringify({ fields: error.fields }));
            }

            const controller = new InfoController();

            const promise = controller.getInfo.apply(controller, validatedArgs as any);
            return promiseHandler(controller, promise, context, undefined, next);
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        router.get('/api/orders/:workspaceId/strategies/:strategyId/orders',
            async function OrderController_getBotOrderDescriptors(context: any, next: any) {
            const args = {
                    workspaceId: {"in":"path","name":"workspaceId","required":true,"dataType":"string"},
                    strategyId: {"in":"path","name":"strategyId","required":true,"dataType":"string"},
            };

            let validatedArgs: any[] = [];
            try {
              validatedArgs = getValidatedArgs(args, context, next);
            } catch (error) {
              context.status = error.status;
              context.throw(error.status, JSON.stringify({ fields: error.fields }));
            }

            const controller = new OrderController();

            const promise = controller.getBotOrderDescriptors.apply(controller, validatedArgs as any);
            return promiseHandler(controller, promise, context, undefined, next);
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        router.post('/api/sandbox/run',
            async function SandboxController_runBacktest(context: any, next: any) {
            const args = {
                    req: {"in":"body","name":"req","required":true,"ref":"ApiBacktestRequest"},
            };

            let validatedArgs: any[] = [];
            try {
              validatedArgs = getValidatedArgs(args, context, next);
            } catch (error) {
              context.status = error.status;
              context.throw(error.status, JSON.stringify({ fields: error.fields }));
            }

            const controller = new SandboxController();

            const promise = controller.runBacktest.apply(controller, validatedArgs as any);
            return promiseHandler(controller, promise, context, undefined, next);
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        router.get('/api/sandbox/results/status/:instanceIdOrName',
            async function SandboxController_getBotResultsStatus(context: any, next: any) {
            const args = {
                    instanceIdOrName: {"in":"path","name":"instanceIdOrName","required":true,"dataType":"string"},
            };

            let validatedArgs: any[] = [];
            try {
              validatedArgs = getValidatedArgs(args, context, next);
            } catch (error) {
              context.status = error.status;
              context.throw(error.status, JSON.stringify({ fields: error.fields }));
            }

            const controller = new SandboxController();

            const promise = controller.getBotResultsStatus.apply(controller, validatedArgs as any);
            return promiseHandler(controller, promise, context, undefined, next);
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        router.get('/api/sandbox/results/:instanceIdOrName',
            async function SandboxController_getBotResults(context: any, next: any) {
            const args = {
                    instanceIdOrName: {"in":"path","name":"instanceIdOrName","required":true,"dataType":"string"},
            };

            let validatedArgs: any[] = [];
            try {
              validatedArgs = getValidatedArgs(args, context, next);
            } catch (error) {
              context.status = error.status;
              context.throw(error.status, JSON.stringify({ fields: error.fields }));
            }

            const controller = new SandboxController();

            const promise = controller.getBotResults.apply(controller, validatedArgs as any);
            return promiseHandler(controller, promise, context, undefined, next);
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        router.get('/api/sandbox/prices/:symbolPair',
            async function SandboxController_getPrices(context: any, next: any) {
            const args = {
                    symbolPair: {"in":"path","name":"symbolPair","required":true,"dataType":"string"},
                    res: {"in":"query","name":"res","dataType":"string"},
                    from: {"in":"query","name":"from","dataType":"string"},
                    to: {"in":"query","name":"to","dataType":"string"},
            };

            let validatedArgs: any[] = [];
            try {
              validatedArgs = getValidatedArgs(args, context, next);
            } catch (error) {
              context.status = error.status;
              context.throw(error.status, JSON.stringify({ fields: error.fields }));
            }

            const controller = new SandboxController();

            const promise = controller.getPrices.apply(controller, validatedArgs as any);
            return promiseHandler(controller, promise, context, undefined, next);
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        router.get('/api/workspaces/:workspaceId/strategies/:strategyId/instances/:status',
            async function WorkspaceController_getRunningInstances(context: any, next: any) {
            const args = {
                    workspaceId: {"in":"path","name":"workspaceId","required":true,"dataType":"string"},
                    strategyId: {"in":"path","name":"strategyId","required":true,"dataType":"string"},
                    status: {"in":"path","name":"status","required":true,"dataType":"string"},
                    limit: {"in":"query","name":"limit","dataType":"double"},
                    orderBy: {"in":"query","name":"orderBy","dataType":"string"},
                    orderDir: {"in":"query","name":"orderDir","ref":"QueryOrderDirection"},
            };

            let validatedArgs: any[] = [];
            try {
              validatedArgs = getValidatedArgs(args, context, next);
            } catch (error) {
              context.status = error.status;
              context.throw(error.status, JSON.stringify({ fields: error.fields }));
            }

            const controller = new WorkspaceController();

            const promise = controller.getRunningInstances.apply(controller, validatedArgs as any);
            return promiseHandler(controller, promise, context, undefined, next);
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        router.get('/api/workspaces/:workspaceId/strategies/:strategyId/backtests/top',
            async function WorkspaceController_getTopBacktests(context: any, next: any) {
            const args = {
                    workspaceId: {"in":"path","name":"workspaceId","required":true,"dataType":"string"},
                    strategyId: {"in":"path","name":"strategyId","required":true,"dataType":"string"},
                    limit: {"in":"query","name":"limit","dataType":"double"},
                    orderBy: {"in":"query","name":"orderBy","dataType":"string"},
                    orderDir: {"in":"query","name":"orderDir","ref":"QueryOrderDirection"},
            };

            let validatedArgs: any[] = [];
            try {
              validatedArgs = getValidatedArgs(args, context, next);
            } catch (error) {
              context.status = error.status;
              context.throw(error.status, JSON.stringify({ fields: error.fields }));
            }

            const controller = new WorkspaceController();

            const promise = controller.getTopBacktests.apply(controller, validatedArgs as any);
            return promiseHandler(controller, promise, context, undefined, next);
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        router.get('/api/workspaces/:workspaceId/links',
            async function WorkspaceController_getWorkspaceLinks(context: any, next: any) {
            const args = {
                    workspaceId: {"in":"path","name":"workspaceId","required":true,"dataType":"string"},
            };

            let validatedArgs: any[] = [];
            try {
              validatedArgs = getValidatedArgs(args, context, next);
            } catch (error) {
              context.status = error.status;
              context.throw(error.status, JSON.stringify({ fields: error.fields }));
            }

            const controller = new WorkspaceController();

            const promise = controller.getWorkspaceLinks.apply(controller, validatedArgs as any);
            return promiseHandler(controller, promise, context, undefined, next);
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

  function isController(object: any): object is Controller {
      return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
  }

  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

  function promiseHandler(controllerObj: any, promise: Promise<any>, context: any, successStatus: any, next: () => Promise<any>) {
      return Promise.resolve(promise)
        .then((data: any) => {
            let statusCode = successStatus;
            let headers;

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            if (isController(controllerObj)) {
                headers = controllerObj.getHeaders();
                statusCode = controllerObj.getStatus() || statusCode;
            }
            return returnHandler(context, next, statusCode, data, headers);
        })
        .catch((error: any) => {
            context.status = error.status || 500;
            context.throw(context.status, error.message, error);
        });
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function returnHandler(context: any, next: () => any, statusCode?: number, data?: any, headers: any={}) {
        if (!context.headerSent && !context.response.__tsoaResponded) {
            context.set(headers);

            if (data !== null && data !== undefined) {
                context.body = data;
                context.status = 200;
            } else {
                context.status = 204;
            }

            if (statusCode) {
                context.status = statusCode;
            }

            context.response.__tsoaResponded = true;
            return next();
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function getValidatedArgs(args: any, context: any, next: () => any): any[] {
        const errorFields: FieldErrors = {};
        const values = Object.keys(args).map(key => {
            const name = args[key].name;
            switch (args[key].in) {
            case 'request':
                return context.request;
            case 'query':
                return validationService.ValidateParam(args[key], context.request.query[name], name, errorFields, undefined, {"noImplicitAdditionalProperties":"silently-remove-extras"});
            case 'path':
                return validationService.ValidateParam(args[key], context.params[name], name, errorFields, undefined, {"noImplicitAdditionalProperties":"silently-remove-extras"});
            case 'header':
                return validationService.ValidateParam(args[key], context.request.headers[name], name, errorFields, undefined, {"noImplicitAdditionalProperties":"silently-remove-extras"});
            case 'body':
                return validationService.ValidateParam(args[key], context.request.body, name, errorFields, undefined, {"noImplicitAdditionalProperties":"silently-remove-extras"});
            case 'body-prop':
                return validationService.ValidateParam(args[key], context.request.body[name], name, errorFields, 'body.', {"noImplicitAdditionalProperties":"silently-remove-extras"});
            case 'formData':
                if (args[key].dataType === 'file') {
                  return validationService.ValidateParam(args[key], context.request.file, name, errorFields, undefined, {"noImplicitAdditionalProperties":"silently-remove-extras"});
                } else if (args[key].dataType === 'array' && args[key].array.dataType === 'file') {
                  return validationService.ValidateParam(args[key], context.request.files, name, errorFields, undefined, {"noImplicitAdditionalProperties":"silently-remove-extras"});
                } else {
                  return validationService.ValidateParam(args[key], context.request.body[name], name, errorFields, undefined, {"noImplicitAdditionalProperties":"silently-remove-extras"});
                }
            case 'res':
                return responder(context, next);
            }
        });
        if (Object.keys(errorFields).length > 0) {
            throw new ValidateError(errorFields, '');
        }
        return values;
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function responder(context: any, next: () => any): TsoaResponse<HttpStatusCodeLiteral, unknown>  {
        return function(status, data, headers) {
           returnHandler(context, next, status, data, headers);
        };
    };

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
