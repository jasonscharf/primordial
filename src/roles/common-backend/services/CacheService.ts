import { Tedis, TedisPool } from "tedis";
import env from "../env";


const tedis = new Tedis({
    port: env.PRIMO_REDIS_PORT,
    host: env.PRIMO_REDIS_HOSTNAME,
    //password: env.PRIMO_REDIS_PASSWORD,
});


/**
 * Exposes caching functionality via tiny wrapper around Redis.
 * Tracks performance metrics around cache usage.
 */
export class CacheService {

    // TODO: Compare overall performance with RedisJSON

    async get(key: string): Promise<string | number> {
        return tedis.get(key);
    }

    /**
     * Loads a cached JSON object from the cache. If the object does not exist,
     * the delegate will be invoked and its result cached via the given key.
     * @param key 
     * @param timeoutSeconds 
     * @param del 
     */
    async getObject<T>(key: string, timeoutSeconds: number, del: () => Promise<T>): Promise<T> {
        const exists = await tedis.exists(key);
        if (exists) {
            const raw = await tedis.get(key) as string;
            return JSON.parse(raw);
        }
        else {
            const delegateValue = await del();
            const json = JSON.stringify(delegateValue);
            await tedis.setex(key, timeoutSeconds, json);

            // Note the JSON parse _could_ technically be skipped, but that would results in
            // "live" objects being passed on cache misses, which is gross and non-deterministic.
            return JSON.parse(json);
        }
    }

    /**
     * Loads a cached JSON object from the cache. If the object does not exist,
     * the delegate will be invoked and its result cached via the given key.
     * @param key 
     * @param timeoutMs 
     * @param del 
     */
    async delegateString(key: string, timeoutMs: number, del: () => Promise<string>) {
        const exists = await tedis.exists(key);
        if (exists) {
            const raw = await tedis.get(key) as string;
            return JSON.parse(raw);
        }
    }
}
