import { Subscription } from "./Subscription";


/**
 * Dirt-simple publish/subscribe facility.
 */
export class Pubsub {
    private _topics: Map<string, Subscription[]> = new Map();

    has(topic: string): boolean {
        return this._topics.has(topic);
    }
    
    /**
     * Subscribes to a particular topic on the pubsub.
     * @param topic The topic to subscribe to
     * @param callback the handler to invoked when the topic is published.
     */
    subscribe(topic: string, callback: Function): Subscription {
        const sub = new Subscription(topic, callback);
        const subs = this._topics.get(topic) || [];

        sub.dispose = () => {
            sub.kill();
            const existing = this._topics.get(topic);
            const pos = existing.indexOf(sub);
            if (pos > -1) {
                existing.splice(pos, 1);
            }
            if (existing.length === 0) {
                this._topics.delete(topic);
            }
        };

        this._topics.set(topic, subs);
        subs.push(sub);
        return sub;
    }

    /**
     * Publishes a message for a specific topic, invoking and awaiting on any handlers registered for the topic.
     * Note: These calls are executed sequentially on a copy of the handlers collection at time of call to this method.
     * This means that any handlers registered for `topic` that occur _after_ `publish` is called are not invoked.
     * @param topic The topic name, which may be a long-lived identifier or an ephemeral ID, e.g. one in an RPC transaction.
     * @param message The message to send about the topic. Can be anything but must be serializable via `JSON.stringify`. 
     */
    async publish(topic: string, message: any = {}): Promise<unknown[]> {
        const subsInitial = this._topics.get(topic) || [];
        const subs = subsInitial.slice();
        let hasDeadSubs = false;

        const results = [];
        for (let i = 0; i < subs.length; ++i) {
            const sub = subs[i];
            if (!sub.isLive()) {
                hasDeadSubs = true;
                continue;
            }

            results.push(await sub.invokeCallback(message));
        }

        return results;
    }

    /**
     * Wipes out all topics, clearing the pubsub.
     */
    dispose() {
        for (const topic of this._topics.keys()) {
            this.clear(topic);
        }
    }

    /**
     * Purges topics of expired handlers.
     * @param topic The identifier of the topic to remove handlers for.
     */
    flush(topic: string) {
        const subs = this._topics.get(topic) || [];

        console.log(`Flushing expired subscriptions...`);
        let numFlushed = 0;
        for (let i = subs.length - 1; i >= 0; --i) {
            if (!subs[i].isLive()) {
                subs.splice(i, 1);
                ++numFlushed;
            }
        }
        console.log(`Flushed ${numFlushed} expired pubsub subs`);
    }

    /**
     * Removes (disposes) all handlers for a particular topic.
     * @param topic The identifier of the topic to remove handlers for.
     */
    clear(topic: string) {
        const subs = this._topics.get(topic) || [];
        subs.forEach(sub => sub.dispose());
    }
}
