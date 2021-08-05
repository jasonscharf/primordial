import { EventStreamEvent, EventStreamEventName } from "../models/analytics/EventStreamEvent";


export class EventStreamEventEntity implements EventStreamEvent {
    ts: Date;
    name: EventStreamEventName;
    eventJson: object;


    constructor(row?: Partial<EventStreamEvent>) {
        if (row) {
            this.ts = row.ts;
            this.name = row.name;
            this.eventJson = row.eventJson;
        }
    }

    static fromRow(row?: Partial<EventStreamEvent>) {
        return row ? new EventStreamEventEntity(row) : null;
    }
}
