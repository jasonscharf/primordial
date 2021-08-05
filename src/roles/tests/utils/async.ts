import { assert } from "../includes";


export async function assertRejects(fn: Function, message?: string): Promise<Error> {
    let threw = false;
    let error = null;
    try {
        await fn();
    }
    catch (err) {
        threw = true;
        error = err;
    }

    assert.isTrue(threw, message || "expected function to throw");
    return error;
}
