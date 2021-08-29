/**
 * Basic factory pattern that can instantiate some type based on name, 
 * given a handler registered for that name.
 */
export class Factory<TOut = unknown, TArgs = unknown, TIn = string> {
    protected _factories = new Map<TIn, (args?: TArgs) => TOut>();


    register(type: TIn, creator: (args?: TArgs) => TOut) {
        if (this._factories.has(type)) {
            throw new Error(`Factory already contains creation delegate for '${type}'`);
        }
        else {
            this._factories.set(type, creator);
        }
    }

    create(type: TIn, args: TArgs = null): TOut {
        if (!this._factories.has(type)) {
            throw new Error(`Factory could not create unknown type '${type}'`);
        }
        else {
            const creator = this._factories.get(type);
            const instance = creator(args);
            return instance;
        }
    }
}
