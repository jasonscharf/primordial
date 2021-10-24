import { PrimoValidationError } from "../common/errors/errors";
import { QueryOrderDirection } from "../common/models/CommonQueryArgs";
import { isNullOrUndefined } from "./utils";


export function column(columnNameRaw: string, defaultColumn: string, validValues: string[], fieldName?: string): string {
    if (isNullOrUndefined(columnNameRaw)) {
        return defaultColumn;
    }
    columnNameRaw = columnNameRaw.trim();

    if (validValues.concat(defaultColumn).indexOf(columnNameRaw) < 0) {
        throw new PrimoValidationError(`Invalid column '${columnNameRaw}'`, !isNullOrUndefined(fieldName) ? fieldName : "columnName");
    }
    else {
        return columnNameRaw;
    }
}


export function orderDir(orderDirRaw: string | null, defaultOrderDir: QueryOrderDirection = "DESC"): QueryOrderDirection {
    if (isNullOrUndefined(orderDirRaw)) {
        return defaultOrderDir;
    }

    orderDirRaw = orderDirRaw.trim().toUpperCase();
    if (orderDirRaw === "ASC") {
        return "ASC";
    }
    else if (orderDirRaw === "DESC") {
        return "DESC";
    }
    else {
        throw new PrimoValidationError(`Invalid order direction '${orderDirRaw}'`, "orderDir");
    }
}

export function workspaceId(workspaceId: string) {
    if (isNullOrUndefined(workspaceId) || (typeof workspaceId !== "string") || workspaceId.length < 32) {
        throw new PrimoValidationError(`Missing or malformed workspace reference`, "workspaceId");
    }
}

export function strategyId(strategyId: string) {
    if (isNullOrUndefined(strategyId) || (typeof strategyId !== "string") || strategyId.length < 32) {
        throw new PrimoValidationError(`Missing or malformed workspace reference`, "strategyId");
    }
}
