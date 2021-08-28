import env from "../../common-backend/env";
import { assert } from "../includes";
import { db, dbm, tables } from "../../common-backend/includes";
import { getTestData } from "./test-data";


export function isDate(date: Date) {
    return date instanceof Date;
}

export function assertEqualTimes(d1: Date | number, d2: Date | number) {
    const d1d = <Date>(isDate(d1 as Date) ? d1 : new Date(d1));
    const d2d = <Date>(isDate(d2 as Date) ? d2 : new Date(d2));

    const d1Val = d1d.getTime();
    const d2Val = d2d.getTime();
    assert.equal(d1Val, d2Val, `Expected ${d1d} to equal ${d2d} at the ms level`);
}

// Note: Slow. Only use if necessary.
export async function resetDb() {
    await dbm.rollback();
    await dbm.migrate();
    return await getTestData();
}

export async function clearTestPrices() {
    if (!env.isTest()) {
        throw new Error(`Can only clear test prices during test`);
    }

    return db(tables.Prices).delete();
}
