import { Controller } from "tsoa";
import { OnlyInstantiableByContainer } from "typescript-ioc";
import { ParameterizedContext } from "koa";
import { IUser } from "../../common/api";
import { IUserSession } from "../../common/models/user/IUserSession";


export abstract class ControllerBase extends Controller {
    protected _ctx: ParameterizedContext | null = null;
    protected _currentSession: IUserSession | null = null;


    // Needs to be public so it can be set from koa handler
    public set ctx(context: ParameterizedContext | null) {
        const user: IUser = context && context.state ? context.state.user : null;
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
