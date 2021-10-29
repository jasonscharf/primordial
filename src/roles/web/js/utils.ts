import { createError, PrimoSerializableError } from "../../common/errors/errors";


export function parseServerErrors(error: Error): PrimoSerializableError[] {
    let errors: PrimoSerializableError[] = [];
    if (error instanceof Response) {
        const errJson = (error as any).error;
        if (typeof errJson === "object" && Array.isArray(errJson.errors)) {
            errors = errJson.errors.map(createError);
        }
        else {
            errors = errJson.errors.map(createError);
        }
    }
    else {
        errors = [createError(error)];
    }

    return errors;
}
