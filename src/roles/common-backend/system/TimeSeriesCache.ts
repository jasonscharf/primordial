

export interface TimeSeriesCacheEntry<T> {
    from: Date;
    to: Date;
    lastUpdated: Date;
    items: T[];
    gaps: boolean;
}

export interface TimeSeriesCacheArgs<T = unknown> {
    checkForGaps: boolean;
    maxKeys: number;
    maxItemsPerKey: number;
    accessor: (item: T) => Date;
}

/**
 * An in-memory cache for timeseries data.
 * Series data can be sparse, and of mixed time resolution.
 * For performance reason, all data is assumed to be sorted and unique.
 * No sorting or checking for duplicate entries is performed.
 */
export class TimeSeriesCache<T> {
    protected _args: TimeSeriesCacheArgs<T>;
    protected _cache = new Map<string, TimeSeriesCacheEntry<T>>();

    constructor(args: TimeSeriesCacheArgs) {
        this._args = args;
    }

    /**
     * Returns all items in a cached range.
     * @param key 
     * @param from 
     * @param to 
     * @returns 
     */
    getCachedRange(key: string, from: Date, to: Date): T[] {
        if (!this._cache.has(key)) {
            return [];
        }

        const entry = this._cache.get(key);
        const fetched: T[] = [];
        for (const item of entry.items) {
            const ts = this._args.accessor(item);
            if (ts >= from && ts < to) {
                fetched.push(item);
            }
        }

        return fetched;
    }

    /**
     * Returns a cache entry for the given key, or null if it doesn't exist.
     * @param key 
     */
    getEntry(key: string): TimeSeriesCacheEntry<T> {
        if (!this._cache.has(key)) {
            return null;
        }
        else {
            return this._cache.get(key);
        }
    }

    /**
     * Returns the first matching item by timestamp.
     * The given point in time must match the item's accessor'ed value.
     * @param key 
     * @param ts 
     */
    getItem(key: string, ts: Date): T {
        if (!this._cache.has(key)) {
            return null;
        }

        const entry = this._cache.get(key);
        const time = ts.getTime()
        for (const item of entry.items) {
            const ts = this._args.accessor(item);
            if (ts.getTime() === time) {
                return item;
            }
        }

        return null;
    }

    /**
     * Appends new items to the cache under a given key.
     * @param key 
     * @param item 
     */
    append(key: string, item: (T | T[])): void {
        const items = Array.isArray(item) ? item as Array<T> : [item];
        const firstItemTs = this._args.accessor(items[0]);
        const lastItemTs = this._args.accessor(items[items.length - 1]);
        const time = firstItemTs.getTime();

        let entry: TimeSeriesCacheEntry<T> = null;
        if (!this._cache.has(key)) {
            entry = {
                from: firstItemTs,
                to: lastItemTs,
                gaps: false,
                items: items,
                lastUpdated: new Date(),
            };

            this._cache.set(key, entry);
        }
        else {
            entry = this._cache.get(key);
            if (firstItemTs < entry.from) {
                entry.from = firstItemTs;
            }
            if (lastItemTs > entry.to) {
                entry.to = lastItemTs;
            }

            entry.items.push(...items);

            if (time < entry.from.getTime()) {
                entry.from = firstItemTs;
            }
            if (time > entry.to.getTime()) {
                entry.to = firstItemTs;
            }

            entry.lastUpdated = new Date();
        }


        // Prune this entry
        if (entry.items.length > this._args.maxItemsPerKey) {
            entry.items.splice(0, entry.items.length - this._args.maxItemsPerKey);
        }

        // Prune entries themselves
        if (this._cache.size > this._args.maxKeys) {
            let oldestEntry: string = null;
            let oldestEntryTs: number = Number.MAX_VALUE;
            for (const e of Array.from(this._cache.entries())) {
                const [key, entry] = e;
                if (entry.lastUpdated.getTime() < oldestEntryTs) {
                    oldestEntry = key;
                    oldestEntryTs = entry.lastUpdated.getTime();
                }
            }

            if (oldestEntry !== null) {
                this._cache.delete(oldestEntry);
            }
        }
    }
}
