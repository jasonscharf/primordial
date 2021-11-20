/**
 * Measure the time it takes to execute some function, assumed async.
 * Don't forget to `await` this message.
 * @param name 
 * @param fn 
 */
export async function measure(name: string, fn: Function) {
    const start = new Date();
    try {
        await fn();
    }
    finally {
        const end = new Date();
        const duration = end.getTime() - start.getTime();
        console.debug(`[PERF] ${name} done in ${duration}ms`);
    }
}
