import { Knex } from "knex";
import { tables } from "../../constants";


// TimeResolution
const newTimeResolutions = [
    { id: "2h", displayName: "2h" },
    { id: "4h", displayName: "4h" },
    { id: "6h", displayName: "6h" },
    { id: "12h", displayName: "12h" },
];

export async function up(knex: Knex): Promise<void> {
    for (const res of newTimeResolutions) {
        const { id, displayName } = res;
        await knex(tables.TimeResolutions).insert({
            id,
            displayName,
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    for (const res of newTimeResolutions) {
        await knex(tables.TimeResolutions)
            .delete()
            .where({ id: res.id })
            .limit(1)
            ;
    }
}
