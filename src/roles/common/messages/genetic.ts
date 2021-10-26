import { ApiBaseRequest, ApiBaseResponse } from "./common";
import { ApiTimeResolution } from "./trading";
import { BotMode } from "../models/system/Strategy";
import { BotType } from "../models/bots/BotType";


export interface ApiBacktestRequest extends ApiBaseRequest {
    from: string;
    to: string;
    genome: string;
    res: ApiTimeResolution;
    symbols: string;
    maxWagerPct?: number;
    remove?: boolean;
    name?: string;
    returnEarly?: boolean;
}

export interface ApiForkGenotypeRequest extends ApiBaseRequest {
    parentId: string;
    allocationId: string;
    typeId: BotType;
    modeId: BotMode;
    displayName?: string;
    res: string;
    maxWagerPct?: number;
    overlayMutations?: boolean;
    symbolPairs: string[];
    mutations?: string[];
}

export interface ApiForkGenotypeResponse extends ApiBaseResponse {
    ids: string[];
}
