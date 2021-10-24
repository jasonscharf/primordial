// PROTOCOL

import { isNullOrUndefined } from "../utils";

// Don't rename these values - they are used on the MQ.
export enum ErrorType {
    GENERIC = "primo.err.generic",
    MISSING_ARG = "primo.err.missing-arg",
    ALREADY_EXISTS = "primo.err.already-exists",
    UNKNOWN_NAME = "primo.err.unknown-name",
    MALFORMED = "primo.err.malformed",
    VALIDATION = "primo.err.validation",
    DATABASE = "primo.err.database",
};

export class PrimoSerializableError extends Error {

    // Don't rename this, it's considered protocol, i.e. there may be existing messages on the queue with these values.
    primoErrorType = ErrorType.GENERIC;
    code: number = 500;
    message: string;
    stack: string;

    constructor(message: string, code = 500) {
        super(message);

        this.code = code;
        this.message = message;
        this.stack = (new Error()).stack;
    }

    serialize(): string {
        return JSON.stringify(this, null, 2);
    }
}

export class PrimoMissingArgumentError extends PrimoSerializableError {
    primoErrorType = ErrorType.MISSING_ARG;
}

export class PrimoAlreadyExistsError extends PrimoSerializableError {
    primoErrorType = ErrorType.ALREADY_EXISTS;
}

export class PrimoUnknownName extends PrimoSerializableError {
    primoErrorType = ErrorType.UNKNOWN_NAME;
}
export class PrimoMalformedGenomeError extends PrimoSerializableError {
    primoErrorType = ErrorType.MALFORMED;
}

export class PrimoValidationError extends PrimoSerializableError {
    primoErrorType = ErrorType.VALIDATION;
    fieldName: string;
    fieldNameHuman: string;

    constructor(message: string, fieldName: string, fieldNameHuman?: string) {
        super(message, 400);
        this.fieldName = fieldName;
        this.fieldNameHuman = !isNullOrUndefined(fieldNameHuman) ? fieldNameHuman : fieldName;
    }
}

export class PrimoDatabaseError extends PrimoSerializableError {
    primoErrorType = ErrorType.DATABASE;
}


export function createError(props: Error | PrimoSerializableError) {
    if ((props as PrimoSerializableError).primoErrorType) {
        let newError: Error | PrimoSerializableError;
        let asPrimoError = props as PrimoSerializableError;
        switch (asPrimoError.primoErrorType) {
            case ErrorType.GENERIC:
                newError = new PrimoSerializableError(props.message, asPrimoError.code);
                break;
            case ErrorType.MISSING_ARG:
                newError = new PrimoMissingArgumentError(props.message, asPrimoError.code);
                break;
            case ErrorType.ALREADY_EXISTS:
                newError = new PrimoAlreadyExistsError(props.message, asPrimoError.code);
                break;
            case ErrorType.UNKNOWN_NAME:
                newError = new PrimoUnknownName(props.message, asPrimoError.code);
                break;
            case ErrorType.MALFORMED:
                newError = new PrimoMalformedGenomeError(props.message, asPrimoError.code);
                break;
            case ErrorType.DATABASE:
                newError = new PrimoDatabaseError(props.message);
                break;
            case ErrorType.VALIDATION:
                newError = new PrimoValidationError(props.message, (props as PrimoValidationError).fieldName, (props as PrimoValidationError).fieldNameHuman);
                break;
            default:
                newError = new Error(props.message);
                break;
        }

        return newError;
    }
    else if (props instanceof Error) {
        return props;
    }
    else {
        return new Error((props as any).message);
    }
}
