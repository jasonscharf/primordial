import { Knex } from "knex";


export async function sleep(ms = 1000) {
    return new Promise((res, rej) => setTimeout(res, ms));
}

export function isNullOrUndefined(value: any) {
    if (value === null || value === undefined) {
        return true;
    }
    else {
        return false;
    }
}

export async function addUpdateTimestampTrigger(kx: Knex, tableName: string) {
    const makeFunction = `
        CREATE OR REPLACE FUNCTION update_updated_timestamp_column()
        RETURNS TRIGGER AS $$
        BEGIN
        NEW.updated = now(); 
        RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_${tableName}_change_timestamp BEFORE UPDATE
        ON ${tableName} FOR EACH ROW EXECUTE PROCEDURE 
        update_updated_timestamp_column();
    `;

    await kx.raw(makeFunction);
}

/**
 * General purpose random string of a given length, default length 8.
 * Not suitable for cryptographic purposes.
 * @param len
 */
export function randomString(len = 8) {
    return Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, "")
        .substr(0, len)
        ;
}


export * from "./numbers";

