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

    const orderDir = orderDirRaw.trim().toUpperCase();
    if (orderDir === "ASC") {
        return "ASC";
    }
    else if (orderDir === "DESC") {
        return "DESC";
    }
    else {
        throw new PrimoValidationError(`Invalid order direction '${orderDirRaw}'`, "orderDir");
    }

    return orderDir as QueryOrderDirection;
}

export function workspaceId(workspaceId: string) {
    if (isNullOrUndefined(workspaceId) || (typeof workspaceId !== "string") || workspaceId.length < 32) {
        throw new PrimoValidationError(`Missing or malformed workspace reference`, "workspaceId");
    }

    return isUuid(workspaceId);
}

export function strategyId(strategyId: string): string {
    if (isNullOrUndefined(strategyId) || (typeof strategyId !== "string") || strategyId.length < 32) {
        throw new PrimoValidationError(`Missing or malformed workspace reference`, "strategyId");
    }

    return isUuid(strategyId);
}

export function isArray<T = any>(thinger: unknown, fieldName: string, fieldNameHuman?: string): Array<T> {
    if (isNullOrUndefined(thinger)) {
        throw new PrimoValidationError(`Missing argument`, fieldName);
    }

    if (!Array.isArray(thinger)) {
        throw new PrimoValidationError(`Expected a different type`, fieldName, fieldNameHuman);
    }

    return thinger as Array<T>;
}

export function isUuid(thinger: unknown, fieldName = "id") {
    if (isNullOrUndefined(thinger)) {
        throw new PrimoValidationError(`Missing argument`, fieldName);
    }

    if ((thinger as Array<any>).length !== 36 || typeof thinger !== "string") {
        throw new PrimoValidationError(`Invalid value '${thinger}'`, fieldName);
    }

    // https://stackoverflow.com/questions/7905929/how-to-test-valid-uuid-guid
    const isUuidString = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(thinger);
    if (!isUuidString) {
        throw new PrimoValidationError(`Invalid value '${thinger}`, fieldName);
    }

    return thinger as string;
}

export function isNotNullOrUndefined(thinger: unknown, fieldName: string) {
    if (isNullOrUndefined(thinger)) {
        throw new PrimoValidationError(`Value required`, fieldName);
    }

    return thinger;
}
