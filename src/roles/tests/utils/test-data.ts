import { DateTime } from "luxon";
import env from "../../common-backend/env";
import { BotInstance } from "../../common/models/system/BotInstance";
import { Mode } from "../../common/models/system/Strategy";
import { Money } from "../../common/numbers";
import { Price } from "../../common/models/system/Price";
import { PriceDataRange } from "../../common-backend/services/SymbolService";
import { RunState } from "../../common/models/system/RunState";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { TradeSymbol, TradeSymbolType } from "../../common/models/markets/TradeSymbol";
import { assert } from "../includes";
import { capital, constants, db, strats, sym, users } from "../../common-backend/includes";
import { from, millisecondsPerResInterval, normalizePriceTime } from "../../common-backend/utils/time";
import { version } from "../../common/version";
import { BotDefinition } from "../../common/models/system/BotDefinition";
import { randomName } from "../../common-backend/utils/names";
import { Knex } from "knex";


export interface TestDataCtx {
    testSymbol1: TradeSymbol;
    testSymbol2: TradeSymbol;
}

export const TEST_DEFAULT_NEW_BOT_DEF_PROPS: Partial<BotDefinition> = {
    description: "test",
    genome: "BBBBO",
    symbols: "ETH/BTC",
    displayName: "test",
    name: "test",
};

export const TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS: Partial<BotInstance> = {
    runState: RunState.NEW,
    modeId: Mode.BACK_TEST,
    exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
    currentGenome: "BBBBO",
};

export async function addNewBotDefAndInstance(defProps = TEST_DEFAULT_NEW_BOT_DEF_PROPS, instanceProps = TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS, trx: Knex.Transaction = null) {
    trx = trx || await db.transaction();
    try {
        const appliedDefProps = Object.assign({}, TEST_DEFAULT_NEW_BOT_DEF_PROPS, defProps);
        const appliedInstanceProps = Object.assign({}, TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS, instanceProps);

        const name = randomName();
        if (!appliedDefProps.name) {
            appliedDefProps.name = appliedDefProps.displayName = name;
        }
        if (!appliedInstanceProps.name) {
            appliedInstanceProps.name = appliedInstanceProps.displayName = name;
        }
        if (!appliedDefProps.normalizedGenome) {
            appliedDefProps.normalizedGenome = appliedDefProps.genome;
        }
        if (!appliedInstanceProps.normalizedGenome) {
            appliedInstanceProps.normalizedGenome = appliedInstanceProps.currentGenome;
        }

        const user = await users.getSystemUser();
        const workspace = await strats.getDefaultWorkspaceForUser(user.id, user.id, trx);
        const strat = await strats.getOrCreateDefaultStrategy(workspace.id, user.id, trx);
        const existing = await strats.getBotDefinitionByName(workspace.id, name, trx);
        if (existing) {
            throw new Error(`Bot definition with name '${name}' already exists`);
        }

        const workspaceId = workspace.id;

        if (!appliedDefProps.workspaceId) {
            appliedDefProps.workspaceId = workspaceId;
        }

        const ledger = await capital.createAllocationForBot(strat.id, "100 BTC");
        const { alloc } = ledger;
        const def = await strats.addNewBotDefinition(strat.id, appliedDefProps, trx);
        const instance = await strats.createNewInstanceFromDef(def, name, alloc.id, false, trx);

        await trx.commit();

        return {
            def,
            instance,
        };
    }
    catch (err) {
        await trx.rollback();
        throw err;
    }
}

export function createTestPrice(props?: Partial<Price>) {
    const dummyPriceProps: Partial<Price> = {
        exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
        baseSymbolId: "BTC",
        quoteSymbolId: "USD",
        resId: "1m",
        ts: new Date(),
        open: Money("0"),
        low: Money("0"),
        high: Money("0"),
        close: Money("0"),
        volume: Money("1"),
    };

    return Object.assign({}, dummyPriceProps, props);
}

export async function getTestData() {

    // We're dealing a fresh test DB, so we need to add our own currencies for testing
    const symbolProps1: Partial<TradeSymbol> = {
        typeId: TradeSymbolType.CRYPTO,
        id: "BTC",
        sign: "B",
        displayUnits: 8,
    };

    const symbolProps2: Partial<TradeSymbol> = {
        typeId: TradeSymbolType.CRYPTO,
        id: "USD",
        sign: "U",
        displayUnits: 8,
    };

    const symbol1 = await sym.getSymbol(symbolProps1.id);
    const symbol2 = await sym.getSymbol(symbolProps2.id);

    const testSymbol1 = symbol1 || await sym.addSymbol(symbolProps1);
    const testSymbol2 = symbol2 || await sym.addSymbol(symbolProps2);

    return {
        testSymbol1,
        testSymbol2,
    };
}



export interface TestPriceGenerator {
    (start: Date, end: Date, res: TimeResolution, curr: Date): Partial<Price>;
}


// Note: Money type not used here - number good enough for testing, in this context.
export const sineGenerator: TestPriceGenerator = (start: Date, end: Date, res: TimeResolution, ts: Date) => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    const pct = (ts.getTime() - startMs) / (endMs - startMs);

    // TODO: Complete this stub...

    const s = Math.sin(pct);
    const open = 0;
    const close = s;
    const low = 0;
    const high = s;

    const price = createTestPrice({
        resId: "1m",
        ts: new Date(),
        open: Money(open.toString()),
        low: Money(low.toString()),
        high: Money(high.toString()),
        close: Money(close.toString()),
        volume: Money("1"),
    });

    return price;
}


/**
 * Fills a range with data for the given time resolution.
 * @param exchange 
 * @param pair 
 * @param res 
 * @param start 
 * @param generator Optional OHLCV price generating function
 * @param end 
 */
export async function fillRangeWithData(exchange: string, pair: string, res: TimeResolution, start: Date, end = new Date(), generator: TestPriceGenerator = null) {
    const prices = await generateTestPrices(exchange, pair, res, start, end, generator);
    return sym.addPriceData(exchange, res, prices);
}

/**
 * Generates mock price data suitable for saving into the DB for testing.
 * @param exchange 
 * @param pair 
 * @param res 
 * @param start 
 * @param end 
 * @param generator 
 * @returns 
 */
export async function generateTestPrices(exchange: string, pair: string, res: TimeResolution, start: Date, end = new Date(), generator: TestPriceGenerator = null) {
    const [base, quote] = sym.parseSymbolPair(pair);
    const baseProps = createTestPrice({
        exchangeId: exchange,
        baseSymbolId: base,
        quoteSymbolId: quote,
        resId: "1m",
        ts: normalizePriceTime(res, start),
        open: Money("0"),
        low: Money("0"),
        high: Money("100"),
        close: Money("100"),
        volume: Money("1"),
    });

    const prices: Partial<Price>[] = [];
    let dt = normalizePriceTime(res, start);
    while (dt < end) {
        const { open, low, high, close, volume } = generator
            ? generator(start, end, res, dt)
            : { open: Money("0"), low: Money("0"), high: Money("100"), close: Money("100"), volume: 50 }
            ;

        const p = Object.assign({}, baseProps, {
            ts: new Date(dt),
            open,
            low,
            high,
            close,
            volume,
        });

        dt = new Date(dt.getTime() + millisecondsPerResInterval(res) + 1);
        prices.push(p);
    }

    return prices;
}

export async function fill(start = from("2010-01-01T00:00:00"), end = from("2010-01-01T23:59:59:999"), generator?: TestPriceGenerator) {
    return fillRangeWithData(env.PRIMO_DEFAULT_EXCHANGE, "BTC/USD", TimeResolution.ONE_MINUTE, start, end);
}


export async function getMissingRanges(start = from("2010-01-01T00:00:00"), end = from("2010-01-01T23:59:59:999"), res = TimeResolution.ONE_MINUTE): Promise<PriceDataRange[]> {
    return sym.getMissingRanges(env.PRIMO_DEFAULT_EXCHANGE, "BTC/USD", res, start, end);
}



function makeTestbot(props: Partial<BotInstance>) {
    const definitionId = "";

    const baseProps: Partial<BotInstance> = {
        runState: RunState.NEW,
        build: version.full,
        currentGenome: constants.DEFAULT_GENOME,
        displayName: `testbot`,
        definitionId,
        modeId: Mode.FORWARD_TEST,
        stateInternal: {
            baseSymbolId: "BTC",
            quoteSymbolId: "TUSD",
        },
        stateJson: {
        },
    };

    return Object.assign({}, baseProps, props);
}
