// PROTOCOL

// Don't rename these values - they are used on the MQ.
export enum ErrorType {
    GENERIC = "primo.err.generic",
    MISSING_ARG = "primo.err.missing-arg",
    ALREADY_EXISTS = "primo.err.already-exists",
    UNKNOWN_NAME = "primo.err.unknown-name",
    MALFORMED = "primo.err.malformed",
};

export class PrimoSerializableError extends Error {

    // Don't rename this, it's considered protocol, i.e. there may be existing messages on the queue with these values.
    primoErrorType = ErrorType.GENERIC;
    code: number = 500;
    message: string;

    constructor(message: string) {
        super(message);

        this.primoErrorType = ErrorType.GENERIC;
        this.message = message;
    }

    serialize(): string {
        return this.toString();
    }
}

export class PrimoMissingArgumentError extends PrimoSerializableError {
    type = ErrorType.MISSING_ARG;
}

export class PrimoAlreadyExistsError extends PrimoSerializableError {
    type = ErrorType.ALREADY_EXISTS;
}

export class PrimoUnknownName extends PrimoSerializableError {
    type = ErrorType.UNKNOWN_NAME;
}
export class PrimoMalformedGenomeError extends PrimoSerializableError {
    type = ErrorType.MALFORMED;
}
