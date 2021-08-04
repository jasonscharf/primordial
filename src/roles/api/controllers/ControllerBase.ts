import { Controller } from "tsoa";
import { ParameterizedContext } from "koa";
import { User } from "../../common/api";
import { UserSession } from "../../common/models/user/UserSession";


export abstract class ControllerBase extends Controller {
    protected _ctx: ParameterizedContext | null = null;
    protected _currentSession: UserSession | null = null;


    // Needs to be public so it can be set from koa handler
    public set ctx(context: ParameterizedContext | null) {
        const user: User  = context && context.state ? context.state.user : null;
        this._currentSession = { user };
        this._ctx = context;
    }

    public get ctx(): ParameterizedContext | null {
        return this._ctx;
    }

    public get currentSession() {
        return this._currentSession;
    }

    public get currentUserId() {
        return this.currentSession && this.currentSession.user ?
            this.currentSession.user.id : null;
    }
}
