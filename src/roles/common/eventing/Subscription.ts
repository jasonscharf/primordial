/**
 * An event subscription that can be fired multiple times, or a set number of times.
 */
export class Subscription {
    private _topic: string;
    private _callback: Function;
    private _count = 0;
    private _limit = Number.POSITIVE_INFINITY;
    private _isAlive: boolean = true;


    constructor(topic: string, callback: Function) {
        this._topic = topic;
        this._callback = callback;
    }

    public dispose: () => void;
    async invokeCallback(args: any): Promise<any> {
        ++this._count;
        return await this._callback(args);
    }

    isLive(): boolean {
        return this._isAlive && (this._count < this._limit);
    }

    kill(): void {
        this._isAlive = false;
    }
}
