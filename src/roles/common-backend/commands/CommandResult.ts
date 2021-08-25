import { Stream } from "stream";


/**
 * Represents the result of a command.
 */
 export interface CommandResult<TResultType = unknown> {
    success: boolean;
    invocationId: string;
    mimeType: string;
    output?: TResultType | Buffer;
    csvFields?: string[];
    duration?: number;
}
