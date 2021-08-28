import { User } from "../../common/models/user/User";


/**
 * Represents invocation of a system command.
 * Commands can be handle by workers or by the web tier.
 * HTTP concerns (requests, responses, etc) should not leak into commanding.
 */
export interface CommandContext<TArgs = unknown> {
    requestingUserId: string;
    currentUser: User;
    commandName: string;
    commandInvocationId: string;
    args: TArgs;
}
