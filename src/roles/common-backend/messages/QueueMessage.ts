/**
 * Represents a sendable message on the queue, sans implementation details
 * about the specific queue technology used.
 */
export interface QueueMessage<TPayload> {
    name: string;
    receivedTs: number,
    sentTs: number,
    payload: TPayload;
}
