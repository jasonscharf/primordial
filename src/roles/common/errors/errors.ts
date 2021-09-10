export class SerializablePrimoError extends Error {}

export class PrimoMissingArgumentError extends SerializablePrimoError { }
export class PrimoAlreadyExistsError extends SerializablePrimoError { }
export class PrimoUnknownName extends SerializablePrimoError { }
export class PrimoMalformedGenomeError extends SerializablePrimoError { }
