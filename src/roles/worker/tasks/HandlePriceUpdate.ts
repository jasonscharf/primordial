import { DateTime } from "luxon";
import { Knex } from "knex";
import env from "../../common-backend/env";
import { BotContext, botIdentifier, buildBotContext } from "../../common-backend/bots/BotContext";
import { BotRunner } from "../../common-backend/bots/BotRunner";
import { Money } from "../../common/numbers";
import { Price } from "../../common/models/markets/Price";
import { PriceUpdateMessage } from "../../common-backend/messages/trading";
import { QueueMessage } from "../../common-backend/messages/QueueMessage";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { log, strats } from "../../common-backend/includes";


/**
 * Handles price update messages, i.e. ticking strategies, triggers, etc.
 * @param msg 
 */
export function handlePriceUpdate(msg: QueueMessage<PriceUpdateMessage>) {
    const { payload } = msg;

    const price: Price = {
        exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
        baseSymbolId: payload.baseSymbolId,
        quoteSymbolId: payload.quoteSymbolId,
        close: Money(payload.close),
        open: Money(payload.open),
        low: Money(payload.low),
        high: Money(payload.high),
        resId: TimeResolution.ONE_SECOND,
        ts: DateTime.fromISO(payload.ts as any).toJSDate(),
        volume: Money(payload.volume),
    };

    // ... for each strategy

    dispatchTicksRunningBots(price)
        .catch(err => log.error(err))
        ;
}

const tickingBots = new Map<string, boolean>();

export async function dispatchTicksRunningBots(msg: PriceUpdateMessage) {

    // ... fetch all live strategies and allocations
    // ... grab all bot definitions that match this symbol pair
    // ... distribute the work on the hipri queue
    // ... other worker roles will pick up bot update messages and do the delegate work

    // Issue _one_ query to the DB to find all live bots for the strategy

    const price = msg;
    const botFilter = `${price.baseSymbolId}/${price.quoteSymbolId}`;
    const runningBots = await strats.getRunningBotsForFilter(botFilter);
    const botsToInitialize = await strats.getBotsToInitialize(botFilter);
    const sentTs = Date.now();
    const msgPromises = [];

    for (const bot of runningBots.concat(botsToInitialize)) {
        const identifier = botIdentifier(bot);

        // Skip (or warn) on reentrant ticks, i.e. when the debugger is paused
        if (tickingBots.has(bot.id) && tickingBots.get(bot.id) === true) {
            if (!env.isDev()) {
                log.warn(`Reentrant tick for ${identifier} @ ${msg.ts.toISOString()}`);
            }
            continue;
        }

        tickingBots.set(bot.id, true);

        // Dispatch promise chains in parallel
        const start = Date.now();

        const runner = new BotRunner();
        // TODO: PERF: Combine into the call above to get definitions + instances at once
        const [botInstance, trx] = await strats.lockBotForUpdate(bot.id);


        runner.tickBot(null, botInstance, price, trx)
            .then(() => {
                const end = Date.now();
                const duration = end - start;

                // TODO: Constant/config
                if (duration > 100) {
                    log.debug(`Ran bot '${botIdentifier(bot)}' in ${duration}ms`);
                }

                return trx.commit();
            })
            .catch(err => {
                log.error(`Error running ${identifier}`, err);
                return trx.rollback();
            })
            .finally(() => {
                tickingBots.set(bot.id, false);
            })
            ;
    }
}


export function matchFilter(symbolOrPair: string, filter: string) {
    // TODO
    return filter === symbolOrPair;
}

