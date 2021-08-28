import { Broker, BrokerConfig } from "rascal";
import { Pubsub } from "../../common/eventing/Pubsub";
import env from "../env";
import { constants, log } from "../includes";
import { QueueMessage } from "../messages/QueueMessage";



export interface WorkerCommand {
    id: string;
}



export class QueueService {
    protected _broker: Broker;
    protected _ex = "exchange";
    protected _ps = new Pubsub();


    /**
     * Connects to RabbitMQ with declarative topology via lib "Rascal".
     * @returns
     */
    async connect() {
        return new Promise((res, rej) => {
            try {
                const host = env.PRIMO_MQ_HOSTNAME;
                const user = env.PRIMO_MQ_USERNAME;
                const password = env.PRIMO_MQ_PASSWORD;
                const ex = "echange.system";

                const config: BrokerConfig = {
                    vhosts: {
                        v1: {
                            connection: {
                                url: `amqp://${user}:${password}@${host}:5672`,
                            },
                            "exchanges": {
                                [ex]: {
                                    "assert": true,
                                    "type": "direct"
                                }
                            },
                            "queues": {
                                [constants.queue.CHANNEL_WORKER_LO]: {},
                                [constants.queue.CHANNEL_WORKER_HI]: {},
                            },
                            "bindings": {
                                "b1": {
                                    "source": ex,
                                    "destination": constants.queue.CHANNEL_WORKER_LO,
                                    "destinationType": "queue",
                                    "bindingKey": constants.queue.CHANNEL_WORKER_LO,
                                },
                                "b2": {
                                    "source": ex,
                                    "destination": constants.queue.CHANNEL_WORKER_HI,
                                    "destinationType": "queue",
                                    "bindingKey": constants.queue.CHANNEL_WORKER_HI,
                                }
                            },
                            "publications": {
                                [constants.queue.CHANNEL_WORKER_LO]: {
                                    "vhost": "mq",
                                    "exchange": ex,
                                    "routingKey": constants.queue.CHANNEL_WORKER_LO,
                                },
                                [constants.queue.CHANNEL_WORKER_HI]: {
                                    "vhost": "mq",
                                    "exchange": ex,
                                    "routingKey": constants.queue.CHANNEL_WORKER_HI,
                                }
                            },
                            "subscriptions": {
                                [constants.queue.CHANNEL_WORKER_LO]: {
                                    "queue": constants.queue.CHANNEL_WORKER_LO,
                                    "prefetch": 1
                                },
                                [constants.queue.CHANNEL_WORKER_HI]: {
                                    "queue": constants.queue.CHANNEL_WORKER_HI,
                                    "prefetch": 1
                                }
                            }
                        }
                    }
                }

                Broker.create(config, (err, broker) => {
                    if (err) {
                        throw err;
                    }

                    broker.on("error", (err, { vhost, connectionUrl }) => {
                        console.error('Broker error', err, vhost, connectionUrl);
                    });

                    this._broker = broker;
                    res(broker);
                });
            }
            catch (err) {
                log.error(`Error connecting to message queue`, err);
                rej(err);
            }
        });
    }

    async setupConsume(queueName = constants.queue.CHANNEL_WORKER_HI, consumerTag = "queue-service") {
        const handler = (err: null | Error, subscription) => {
            if (err) {
                throw err;
            }
            subscription
                .on("message", (message, content, ackOrNack) => {
                    const messageObject = JSON.parse(content.toString()) as QueueMessage<unknown>;

                    // Note: It is assumed that `publish` will run in the same frame stack and therefore
                    // any errors that arised can be caught here. This is important, as we'll need to NACK
                    // if we get any errors!
                    try {
                        const subs = this._ps.publish(queueName + "." + messageObject.name, messageObject.payload);
                        ackOrNack();
                    }
                    catch (err) {
                        ackOrNack(err);
                    }
                })
                .on("error", console.error);
        };

        log.debug(`Subscribing to queue '${queueName}'...`)
        this._broker.subscribe(queueName, handler);
    }

    /**
     * 
     * @param name The command or event name
     * @param payload The JSON-serializable payload
     * @param route The routing key indicated the queue to send to
     */
    async addMessage<TMessageType>(name: string, payload: TMessageType, route: string) {
        if (!this._broker) {
            await this.connect();
        }
        const wrapper: QueueMessage<TMessageType> = {
            sentTs: Date.now(),
            receivedTs: null,
            name,
            payload,
        };

        const content = Buffer.from(JSON.stringify(wrapper));
        const publication = await this._broker.publish(route, content, (err, pub) => {
            if (err) {
                log.error(`Error publishing message to worker queue with route '${route}'`, err);
                return;
            }
        });
    }

    async addWorkerMessageHi<TMessageType>(name: string, msg: TMessageType) {
        return this.addMessage(name, msg, constants.queue.CHANNEL_WORKER_HI);
    }

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
        return this._ps.subscribe(queueName + "." + name, handler);
    }

    /**
     * Shuts down the queue service, tearing down any connections the MQ.
     * @returns 
     */
    async shutdown() {
        if (!this._broker) {
            return;
        }

        await this._broker.shutdown(err => log.error(`Message broker shutdown error`, err));
    }
}
