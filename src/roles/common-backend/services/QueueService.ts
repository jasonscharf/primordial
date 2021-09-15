import amqp from "amqplib";
import env from "../env";
import { isNullOrUndefined, randomString } from "../../common/utils";
import { constants, log } from "../includes";
import { PrimoSerializableError } from "../../common/errors/errors";
import { Pubsub } from "../../common/eventing/Pubsub";
import { QueueMessage } from "../messages/QueueMessage";



export interface WorkerCommand {
    id: string;
}



const assertQueueOptions = { durable: true };
const sendToQueueOptions = { persistent: true };

export class QueueService {
    protected _ex = "exchange";
    protected _rpc = new Pubsub();
    protected _commands = new Pubsub();
    protected _conn: amqp.Connection = null;
    protected _channel: amqp.Channel;
    protected _isCli: boolean = false;


    /**
     * Connects to the message queue and asserts system queues.
     */
    protected async _connect() {
        try {

            const host = env.PRIMO_MQ_HOSTNAME;
            const user = env.PRIMO_MQ_USERNAME;
            const password = env.PRIMO_MQ_PASSWORD;
            const ex = "exchange.system";
            this._conn = await amqp.connect(`amqp://${user}:${password}@${host}:5672`);
            const ch = this._channel = await this._conn.createChannel();

            await ch.assertQueue(constants.queue.CHANNEL_WORKER_HI, assertQueueOptions);
            await ch.assertQueue(constants.queue.CHANNEL_WORKER_LO, assertQueueOptions);
            await ch.assertQueue(constants.queue.CHANNEL_RPC_REQUEST, { durable: false });
            await ch.assertQueue(constants.queue.CHANNEL_RPC_RESPONSE, { durable: false });
            await ch.assertQueue(constants.queue.CHANNEL_RPC_RESPONSE_CLI, { durable: false });

        }
        catch (err) {
            log.error(`Error connecting to message queue`, err);
            throw err;
        }
    }

    async disconnect() {
        await this._conn.close();
    }

    /**
     * Connect to the message queue as a publisher and RPC client.
     * @param cli If true, connects via the CLI response queue to route RPC results to the CLI.
     */
    async connectAsPublisher(cli = false) {
        await this._connect();

        this._isCli = cli;

        const ch = this._channel;
        const options: amqp.Options.Consume = {
            exclusive: false,
        };

        const queue = this._isCli
            ? constants.queue.CHANNEL_RPC_RESPONSE
            : constants.queue.CHANNEL_RPC_RESPONSE_CLI
            ;

        ch.consume(queue, async msg => {
            try {
                const { content } = msg;
                const messageObject = JSON.parse(content.toString()) as QueueMessage<unknown>;
                const correlationId = msg.properties.correlationId;

                if (!this._rpc.has(correlationId)) {
                    ch.nack(msg);
                }
                else {
                    await this._rpc.publish(correlationId, messageObject);
                    ch.ack(msg);
                }
            }
            catch (err) {
                log.error(`Error handling RPC response`, err);

                // IMPORTANT: We ack here to kill off the actual message that caused the error
                ch.ack(msg);
            }
        }, options);
    }

    /**
     * Connect to the message queue as a worker consumer.
     */
    async connectAsWorker() {
        await this._connect();

        const ch = this._channel;
        ch.consume(constants.queue.CHANNEL_WORKER_HI, async msg => {
            try {
                const { content } = msg;
                const messageObject = JSON.parse(content.toString()) as QueueMessage<unknown>;

                // Note: It is assumed that `publish` will run in the same frame stack and therefore
                // any errors that arised can be caught here. This is important, as we'll need to NACK
                // if we get any errors!
                this._rpc.publish(constants.queue.CHANNEL_WORKER_HI + "." + messageObject.name, messageObject.payload);
                ch.ack(msg);
            }
            catch (err) {
                log.error(`RPC worker high priority queue error`, err);
                ch.nack(msg);
            }
        });

        ch.consume(constants.queue.CHANNEL_RPC_REQUEST, async msg => {
            const correlationId = msg.properties.correlationId;
            try {
                const { content } = msg;
                const messageObject = JSON.parse(content.toString()) as QueueMessage<unknown>;

                // Note: It is assumed that `publish` will run in the same frame stack and therefore
                // any errors that arised can be caught here. This is important, as we'll need to NACK
                // if we get any errors!

                // Note we're just intentionally taking the first result, even tho the PubSub returns multiple.
                // This is just due to laziness and the fact that PubSub is pre-existing code.
                let [result] = await this._commands.publish(messageObject.name, messageObject.payload);
                if (isNullOrUndefined(result)) {
                    result = {
                        empty: true,
                    };
                }

                const resultContent = Buffer.from(JSON.stringify(result));
                ch.sendToQueue(msg.properties.replyTo, resultContent, { correlationId });

                ch.ack(msg);
            }
            catch (err) {
                log.error(`RPC request error`, err);

                try {
                    let payload: string = null;
                    if (err instanceof PrimoSerializableError) {
                        payload = err.serialize();
                    }
                    else {
                        payload = err.toString();
                    }

                    const errMsg = {
                        primoErrorType: "error",
                        payload,
                    };

                    const wrapperContent = JSON.stringify(errMsg);

                    // Send the error over
                    ch.sendToQueue(msg.properties.replyTo, Buffer.from(wrapperContent), { correlationId });

                    //ch.nack(msg);
                }
                finally {
                    // IMPORTANT: We actually ack the msg here so it doesn't cause an infinite loop.
                    ch.ack(msg);
                }
            }
        });
    }

    /**
     * Registers a particular command handler.
     * @param name 
     * @param cb 
     */
    async addCommandHandler(name: string, cb: Function) {
        if (this._commands.has(name)) {
            throw new Error(`Command '${name}' already has a handler registerd`);
        }
        this._commands.subscribe(name, cb);
    }

    /**
     * Executes a command on the worker pool via RPC over RabbitMQ.
     * @param name 
     * @param args 
     * @returns 
     */
    async executeWorkerCommand<TResultType = unknown>(name: string, args) {
        return new Promise((res, rej) => {
            const correlationId = randomString(16);

            // Subscribe to the RPC result
            this._rpc.subscribe(correlationId, (rpcResult: unknown) => {
                this._rpc.clear(correlationId);
                res(rpcResult);
            });

            this.addMessage(name, args, constants.queue.CHANNEL_RPC_REQUEST, correlationId);
        });
    }

    /**
     * 
     * @param name The command or event name
     * @param payload The JSON-serializable payload
     * @param queue The routing key indicated the queue to send to
     * @param correlationId The optional correlation ID, required when making RPC requests
     */
    async addMessage<TMessageType>(name: string, payload: TMessageType, queue: string, correlationId = null) {
        try {
            if (!correlationId) {
                correlationId = randomString(16);
            }

            const wrapper: QueueMessage<TMessageType> = {
                sentTs: Date.now(),
                receivedTs: null,
                name,
                payload,
            };

            const replyTo = this._isCli
                ? constants.queue.CHANNEL_RPC_RESPONSE
                : constants.queue.CHANNEL_RPC_RESPONSE_CLI
                ;

            const content = Buffer.from(JSON.stringify(wrapper));
            await this._channel.sendToQueue(queue, content, {
                correlationId,
                replyTo,
            });
        }
        catch (err) {
            log.error(`Error publishing message to worker queue with route "${queue}"`, err);
            return;
        }
    }

    /**
     * Posts a message on the high-priority worker queue.
     * @param name
     * @param msg 
     * @returns 
     */
    async addWorkerMessageHi<TMessageType>(name: string, msg: TMessageType) {
        return this.addMessage(name, msg, constants.queue.CHANNEL_WORKER_HI);
    }

    /**
     * Posts a message on the low-priority worker queue.
     * @param name 
     * @param msg 
     * @returns 
     */
    async addWorkerMessageLo<TMessageType>(name: string, msg: TMessageType) {
        return this.addMessage(name, msg, constants.queue.CHANNEL_WORKER_LO);
    }

    /**
     * Subscribes to a particular message by name.
     * @param name 
     * @param handler 
     * @returns 
     */
    subMessage(queueName: string, name: string, handler) {
        return this._rpc.subscribe(queueName + "." + name, handler);
    }

    /**
     * Shuts down the queue service, tearing down any connections to the MQ.
     * @returns 
     */
    async shutdown() {
        await this.disconnect();
    }
}
