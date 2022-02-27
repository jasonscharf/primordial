import { BotInstance } from "../../common/models/bots/BotInstance";
import { GenotypeInstanceDescriptor } from "../../common/models/bots/GenotypeInstanceDescriptor";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { num, NumLike } from "../../common/numbers";
import { isNullOrUndefined } from "../../common/utils";
import { assert, describe } from "../includes";


export function assertDescriptorMatchesInstance(desc: GenotypeInstanceDescriptor, bot: BotInstance) {
    assert.isNotNull(desc);
    assert.isNotNull(bot);
    assert.equal(desc.id, bot.id);
    assert.equal(desc.modeId, bot.modeId);
    assert.equal(desc.resId as TimeResolution, bot.resId);
    assert.deepEqual(desc.state, bot.stateJson);
    assert.equal(desc.runState, bot.runState);
    assert.equal(desc.fsmState, bot.stateJson.fsmState);
    assert.equal(desc.symbols, bot.symbols);
    assert.equal(desc.genome, bot.currentGenome);
    assert.equal(desc.name, bot.name);
    assert.equal(desc.displayName, bot.displayName);
    assert.equal(desc.created + "", bot.created + "");
    assert.equal(desc.updated + "", bot.updated + "");
}

export function assertNumsLess(a: NumLike, b: NumLike, msg: string = null) {
    if (isNullOrUndefined(msg)) {
        msg = `${a} < ${b}`;
    }
    assert.ok(num(a).lt(num(b)), msg);
}

export function assertNumsLessOrEqual(a: NumLike, b: NumLike, msg: string = null) {
    if (isNullOrUndefined(msg)) {
        msg = `${a} <= ${b}`;
    }
    assert.ok(num(a).lte(num(b)), msg);
}

export function assertNumsGreater(a: NumLike, b: NumLike, msg: string = null) {
    if (isNullOrUndefined(msg)) {
        msg = `${a} > ${b}`;
    }
    assert.ok(num(a).gt(num(b)), msg);
}

export function assertNumsGreaterOrEqual(a: NumLike, b: NumLike, msg: string = null) {
    if (isNullOrUndefined(msg)) {
        msg = `${a} >= ${b}`;
    }
    assert.ok(num(a).gte(num(b)), msg);
}

export function assertNumsEqual(a: NumLike, b: NumLike, msg: string = null) {
    if (isNullOrUndefined(msg)) {
        msg = `assertNumsEqual: ${a}, ${b}`;
    }
    assert.equal(num(a) + "", num(b) + "", msg);
}

export function assertNoOrders(d: GenotypeInstanceDescriptor) {
    assertNumsEqual(d.numOrders, 0, "numOrders");
    assertNumsEqual(d.totalFees, 0, "numOrders");
}

export function assertOrders(d: GenotypeInstanceDescriptor) {
    assertNumsGreater(d.numOrders, 0, "numOrders");
    assertNumsGreater(d.totalFees, 0, "numOrders");
}

export function assertNoRealizedProfit(d: GenotypeInstanceDescriptor) {
    assertNumsLessOrEqual(d.avgProfitPerDay, 0, "avgProfitPerDay");
    assertNumsLessOrEqual(d.avgProfitPctPerDay, 0, "avgProfitPctPerDay");
    assertNumsLessOrEqual(d.totalProfit, 0, "totalProfit");
    assertNumsLessOrEqual(d.totalProfitPct, 0, "totalProfitPct");
}

export function assertRealizedProfit(d: GenotypeInstanceDescriptor) {
    assertNumsGreater(d.avgProfitPerDay, 0, "avgProfitPerDay");
    assertNumsGreater(d.avgProfitPctPerDay, 0, "avgProfitPctPerDay");
    assertNumsGreater(d.totalProfit, 0, "totalProfit");
    assertNumsGreater(d.totalProfitPct, 0, "totalProfitPct");
}

export function assertNoRealizedLosses(d: GenotypeInstanceDescriptor) {
    assertNumsGreaterOrEqual(d.avgProfitPerDay, 0, "avgProfitPerDay");
    assertNumsGreaterOrEqual(d.avgProfitPctPerDay, 0, "avgProfitPctPerDay");
    assertNumsGreaterOrEqual(d.totalProfit, 0, "totalProfit");
    assertNumsGreaterOrEqual(d.totalProfitPct, 0, "totalProfitPct");
}

export function assertRealizedLosses(d: GenotypeInstanceDescriptor) {
    assertNumsLess(d.avgProfitPerDay, 0, "avgProfitPerDay");
    assertNumsLess(d.avgProfitPctPerDay, 0, "avgProfitPctPerDay");
    assertNumsLess(d.totalProfit, 0, "totalProfit");
    assertNumsLess(d.totalProfitPct, 0, "totalProfitPct");
}

export function assertNoAction(d: GenotypeInstanceDescriptor) {
    assertNoOrders(d);
    assertNoRealizedProfit(d);
    assertNoRealizedLosses(d);
}
