import { Knex } from "knex";
import { BotContext, botIdentifier, buildBotContext } from "../../common-backend/bots/BotContext";
import { BotDefinition } from "../../common/models/system/BotDefinition";
import { BotImplementation } from "../../common-backend/bots/BotImplementation";
import { BotInstance } from "../../common/models/system/BotInstance";
import { BotRun } from "../../common/models/system/BotRun";
import { GeneticBot } from "../bots/GeneticBot";
import { GenomeParser } from "../../common-backend/genetics/GenomeParser";
import { Factory } from "../../common-backend/bots/BotFactory";
import { PriceUpdateMessage } from "../../common-backend/messages/trading";
import { QueueMessage } from "../../common-backend/messages/QueueMessage";
import { RunState } from "../../common/models/system/RunState";
import { constants, db, log, mq, strats } from "../../common-backend/includes";
import env from "../../common-backend/env";
import { DEFAULT_BOT_IMPL } from "../../common-backend/genetics/base";


/**
 * Handles price update messages, i.e. ticking strategies, triggers, etc.
 * @param msg 
 */
export function handlePriceUpdate(msg: QueueMessage<PriceUpdateMessage>) {
    const price = msg.payload;

    // ... for each strategy

    dispatchTicksRunningBots(msg);
}


export async function dispatchTicksRunningBots(msg: QueueMessage<PriceUpdateMessage>) {

    // ... fetch all live strategies and allocations
    // ... grab all bot definitions that match this symbol pair
    // ... distribute the work on the hipri queue
    // ... other worker roles will pick up bot update messages and do the delegate work

    // Issue _one_ query to the DB to find all live bots for the strategy

    const price = msg.payload;
    const botFilter = `${price.baseSymbolId}/${price.quoteSymbolId}`;
    const runningBots = await strats.getRunningBotsForFilter(botFilter);
    const botsToInitialize = await strats.getBotsToInitialize(botFilter);
    const sentTs = Date.now();
    const msgPromises = [];

    for (const bot of runningBots.concat(botsToInitialize)) {
        const identifier = `bot ${bot.name} (${bot.id.substr(0, 8)})`;

        // Dispatch promise chains in parallel
        const start = Date.now();

        // TODO: PERF: Combine into the call above to get definitions + instances at once
        tickBot(null, bot, price)
            .then(() => {
                const end = Date.now();
                const duration = end - start;

                // TODO: Constant/config
                if (duration > 100) {
                    log.debug(`Ran bot '${botIdentifier(bot)}' in ${duration}ms`);
                }
            })
            .catch(err => log.error(`Error running ${identifier}`, err));
    }
}


export function matchFilter(symbolOrPair: string, filter: string) {
    // TODO
    return filter === symbolOrPair;
}


// TODO: Extract
const botFactory = new Factory();
botFactory.register(DEFAULT_BOT_IMPL, args => new GeneticBot());

/**
 * Ticks a stateful trading bot.
 * @param def 
 * @param instanceRecord 
 * @param price 
 */
export async function tickBot(def: BotDefinition, instanceRecord: BotInstance, price: PriceUpdateMessage) {
    const start = Date.now();
    const run: BotRun = null; // TODO
    const ctx = await buildBotContext(def, instanceRecord, run);

    // TODO: Extract to BotRunner facility

    const { genome } = ctx;
    const botType = genome.getGene<string>("META", "IMPL").value;
    const instance = botFactory.create(botType) as BotImplementation;

    // Initialize new bots in a transaction to ensure we don't initialize it multiple times
    if (instanceRecord.runState === RunState.INITIALIZING) {
        let trx = await db.transaction();
        try {
            log.info(`Initializing ${botIdentifier(instanceRecord)}`);

            const newState = await instance.initialize(ctx);

            if (newState) {
                instanceRecord.stateJson = newState;
            }

            instanceRecord.runState = RunState.ACTIVE;
            instanceRecord.prevTick = new Date();

            await strats.updateBotInstance(instanceRecord, trx);
            await trx.commit();
        }
        catch (err) {
            log.error(`Error initializing ${botIdentifier(instanceRecord)}. Rolling back...`, err);

            instanceRecord.runState = RunState.ERROR;
            await trx.rollback();
            await strats.updateBotInstance(instanceRecord);
        }
    }



    if (instanceRecord.runState === RunState.ACTIVE) {
        await instance.computeIndicatorsForTick(ctx, price);
        const tickState = await instance.tick(ctx, price);

        if (tickState !== null && instanceRecord.stateJson !== undefined) {
            instanceRecord.stateJson = tickState;
        }

        instanceRecord.prevTick = new Date();
        //log.debug(`Updating ${botIdentifier(instanceRecord)} in the DB...`);

        await strats.updateBotInstance(instanceRecord);
    }

    const duration = Date.now() - start;
    //log.debug(`Done ticking ${botIdentifier(instanceRecord)} in ${duration}ms`);
}
