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

export * from "./numbers";
