import { Pubsub } from "../../common/eventing/Pubsub";

export enum SocketClientState {
    CONNECTING,
    ACTIVE,
    DISCONNECTED,
}

interface SocketClientOptions {
}

export class SocketClient {
    protected _pubsub: Pubsub;
    protected _state: SocketClientState;

    // TODO: Implment when WebSockets required
}
