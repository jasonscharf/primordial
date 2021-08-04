// Note: Not a table, just arbitrary trings for easy extensibility.
// Could be broken out into a separate table in the near future.
export enum EventStreamEventName {
    WORKER_ROLE_START = "worker.start",
    WORKER_ROLE_STOP = "worker.stop",
    USER_LOGIN = "user.login",
}

export interface EventStreamEvent {
    ts: Date;
    name: EventStreamEventName;
    eventJson: object;
}
