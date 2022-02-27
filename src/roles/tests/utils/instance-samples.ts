import { AddTestInstanceArgs } from "./types";
import { BotMode } from "../../common/models/system/Strategy";
import { RunState } from "../../common/models/system/RunState";
import { num } from "../../common/numbers";
import { testOrders } from "./ordering";
import { GenotypeInstanceDescriptor } from "../../common/models/bots/GenotypeInstanceDescriptor";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { assert, assertNoAction, assertNumsEqual, assertRealizedLosses, assertRealizedProfit, assertUnrealizedProfit } from "./assertions";


export type InstanceSample = { args: Partial<AddTestInstanceArgs>, expected: InstanceSampleAssertionBlock };
const defaultTestInstanceArgs = {};

export type InstanceSampleAssertionBlock = (d: GenotypeInstanceDescriptor, i?: BotInstance) => Promise<void>;


// Expected outcomes for tests of samples
export const expecteds = {
    noAction: (d) => {
        assertNoAction(d);
    },
    singleBuyLose10: (d) => {
        // TODO
        debugger;
    },
    gain10Realized: (d) => {
        assertRealizedProfit(d);
        assertNumsEqual(d.numOrders, 2, "numOrders");
        assertNumsEqual(d.totalProfit, num(9.79), "totalProfit");
        assertNumsEqual(d.totalFees, num(0.210), "totalFees");
        assertNumsEqual(d.totalProfitPct, 0.0979, "totalProfitPct");
        assertNumsEqual(d.avgProfitPerDay, num(0.979), "avgProfitPerDay");
        assertNumsEqual(d.avgProfitPctPerDay, 0.0098, "avgProfitPctPerDay");
    },
    gain10RealizedGain5: (d) => {
        assertRealizedProfit(d);
        assertUnrealizedProfit(d);

        debugger;
        // TODO
        assertNumsEqual(d.numOrders, 3, "numOrders");
        assertNumsEqual(d.totalProfit, num(9.79));
        assertNumsEqual(d.totalProfit, num(9.79), "totalProfit");
        assertNumsEqual(d.totalFees, num(0.210), "totalFees");
        assertNumsEqual(d.totalProfitPct, 0.0979, "totalProfitPct");
        assertNumsEqual(d.avgProfitPerDay, num(0.979), "avgProfitPerDay");
        assertNumsEqual(d.avgProfitPctPerDay, 0.0098, "avgProfitPctPerDay");
    },
    gain10RealizedLose5: (d) => {
        debugger;

        // TODO
        assertNumsEqual(d.numOrders, 3, "numOrders");
        assertNumsEqual(d.totalProfit, num(9.79));
        assertNumsEqual(d.totalProfit, num(9.79), "totalProfit");
        assertNumsEqual(d.totalFees, num(0.210), "totalFees");
        assertNumsEqual(d.totalProfitPct, 0.0979, "totalProfitPct");
        assertNumsEqual(d.avgProfitPerDay, num(0.979), "avgProfitPerDay");
        assertNumsEqual(d.avgProfitPctPerDay, 0.0098, "avgProfitPctPerDay");
    },
    lose10Realized: (d) => {
        assertRealizedLosses(d);

        assertNumsEqual(d.numOrders, 2, "numOrders");
        assertNumsEqual(d.totalProfit, num(-9.79), "totalProfit");
        assertNumsEqual(d.totalFees, num(-0.210), "totalFees");
        assertNumsEqual(d.totalProfitPct, -0.0979, "totalProfitPct");
        assertNumsEqual(d.avgProfitPerDay, num(-0.979), "avgProfitPerDay");
        assertNumsEqual(d.avgProfitPctPerDay, -0.0098, "avgProfitPctPerDay");
    },
    lose10RealizedLose5: (d) => {
        assertRealizedLosses(d);

        // TODO
        debugger;
    },
};

// Sample instance args
export const noStartInstance: Partial<AddTestInstanceArgs> = {
    start: false,
};

export const startInstance: Partial<AddTestInstanceArgs> = {
    start: true,
};

export const stopInstance: Partial<AddTestInstanceArgs> = {
    stop: true,
};
export const paused: Partial<AddTestInstanceArgs> = {
    runState: RunState.PAUSED,
};
export const error: Partial<AddTestInstanceArgs> = {
    runState: RunState.ERROR,
};

export const back: Partial<AddTestInstanceArgs> = {
    modeId: BotMode.BACK_TEST,
};
export const forward: Partial<AddTestInstanceArgs> = {
    modeId: BotMode.FORWARD_TEST,
};


export const backNew: Partial<AddTestInstanceArgs> = {
    ...back,
    ...noStartInstance,
};
export const backActive: Partial<AddTestInstanceArgs> = {
    ...back,
    ...startInstance,
};
export const backCompleted: Partial<AddTestInstanceArgs> = {
    ...back,
    ...startInstance,
    ...stopInstance,
};
export const backErrored: Partial<AddTestInstanceArgs> = {
    ...back,
    ...startInstance,
    ...stopInstance,
    ...error,
};

export const forwardNew: Partial<AddTestInstanceArgs> = {
    ...forward,
    ...noStartInstance,
};
export const forwardActive: Partial<AddTestInstanceArgs> = {
    ...forward,
    ...startInstance,
};
export const forwardCompleted: Partial<AddTestInstanceArgs> = {
    ...forward,
    ...startInstance,
    ...stopInstance,
};
export const forwardErrored: Partial<AddTestInstanceArgs> = {
    ...forward,
    ...startInstance,
    ...stopInstance,
    ...error,
};

// Samples
const backTestNew: InstanceSample = {
    args: {
        ...noStartInstance,
        ...backNew,
    },
    expected: expecteds.noAction,
} as InstanceSample,

    backTestActiveNoOrders = {
        args: {
            ...backActive,
        },
        expected: expecteds.noAction,
    } as InstanceSample,

    backTestActiveGain10Realized = {
        args: {
            ...backActive,
            orders: testOrders.ordersWithGain10Realized,
            state: {
                prevPrice: num(100),
                latestPrice: num(100),
            },
        },
        expected: expecteds.gain10Realized,
    } as InstanceSample,

    backTestActiveGain10RealizedGain0 = {
        args: {
            ...backActive,
            orders: testOrders.ordersWithGain10RealizedTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(100),
            },
        },
        expected: expecteds.gain10Realized,
    } as InstanceSample,

    backTestActiveGain10RealizedGain5 = {
        args: {
            ...backActive,
            orders: testOrders.ordersWithGain10RealizedTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(105),
            },
        },
        expected: expecteds.gain10RealizedGain5,
    } as InstanceSample,

    backTestActiveGain10RealizedLose5 = {
        args: {
            ...backActive,
            orders: testOrders.ordersWithGain10RealizedTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(95),
            },
        },
        expected: expecteds.gain10RealizedLose5,
    } as InstanceSample,

    backTestCompletedWithNoOrders = {
        args: {
            ...backCompleted,
            orders: [],
        },
        expected: expecteds.noAction,
    } as InstanceSample,

    backTestCompletedWithGain10Realized = {
        args: {
            ...backCompleted,
            orders: testOrders.ordersWithGain10Realized,
        },
        expected: expecteds.gain10Realized,
    } as InstanceSample,

    backTestCompletedWithGain10RealizedGain5 = {
        args: {
            ...backCompleted,
            orders: testOrders.ordersWithGain10RealizedTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(105),
            },
        },
        expected: expecteds.gain10RealizedGain5,
    } as InstanceSample,

    backTestCompletedWithGain10RealizedLose5 = {
        args: {
            ...backCompleted,
            orders: testOrders.ordersWithGain10RealizedTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(95),
            },
        },
        expected: expecteds.gain10RealizedLose5,
    } as InstanceSample,

    backTestCompletedWithLose10Realized = {
        args: {
            ...backCompleted,
            orders: testOrders.ordersWithLose10Realized,
        },
        expected: expecteds.lose10Realized,
    } as InstanceSample,

    backTestCompletedWithLose10RealizedLose5 = {
        args: {
            ...backCompleted,
            orders: testOrders.ordersWithLose10Realized,
            state: {
                prevPrice: num(100),
                latestPrice: num(95),
            },
        },
        expected: expecteds.lose10RealizedLose5,
    } as InstanceSample,

    backTestCompletedWithErrorAndNoOrders = {
        args: {
            ...backCompleted,
            runState: RunState.ERROR,
        },
        expected: expecteds.noAction,

    } as InstanceSample,

    backTestCompletedWithErrorGain10Realized = {
        args: {
            ...backCompleted,
            orders: testOrders.ordersWithGain10Realized,
        },
        expected: expecteds.gain10Realized,
    } as InstanceSample,

    backTestCompletedWithSingleBuyLose10 = {
        args: {
            ...backCompleted,
            orders: testOrders.ordersWithSingleBuyTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(90),
            },
        },
        expected: expecteds.singleBuyLose10,
    } as InstanceSample,





    forwardTestNew = {
        args: {
            ...forwardNew,
        },
        expected: expecteds.noAction,
    } as InstanceSample,

    forwardTestActiveGain10Realized = {
        args: {
            ...forwardActive,
            orders: testOrders.ordersWithGain10Realized,
            state: {
                prevPrice: num(100),
                latestPrice: num(100),
            },
        },
        expected: expecteds.gain10Realized,
    } as InstanceSample,

    forwardTestActiveGain10RealizedGain0 = {
        args: {
            ...forwardActive,
            orders: testOrders.ordersWithGain10RealizedTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(100),
            },
        },
        expected: expecteds.gain10Realized,
    } as InstanceSample,

    forwardTestActiveGain10RealizedGain5 = {
        args: {
            ...forwardActive,
            orders: testOrders.ordersWithGain10RealizedTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(105),
            },
        },
        expected: expecteds.gain10Realized,
    } as InstanceSample,

    forwardTestActiveGain10RealizedLose5 = {
        args: {
            ...forwardActive,
            orders: testOrders.ordersWithGain10RealizedTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(95),
            },
        },
        expected: expecteds.gain10RealizedLose5,
    } as InstanceSample,


    forwardTestActiveNoOrders = {
        args: {
            ...forwardActive,
        },
        expected: expecteds.noAction,
    } as InstanceSample,

    forwardTestCompletedWithErrorAndNoOrders = {
        args: {
            ...forwardCompleted,
        },
        expected: expecteds.noAction,
    } as InstanceSample,

    forwardTestCompletedWithErrorGain10Realized = {
        args: {
            ...forwardCompleted,
            orders: testOrders.ordersWithGain10Realized,
        },
        expected: expecteds.gain10Realized,
    } as InstanceSample,

    forwardTestCompletedWithGain10Realized = {
        args: {
            ...forwardCompleted,
            orders: testOrders.ordersWithGain10Realized,
        },
        expected: expecteds.gain10Realized,
    } as InstanceSample,

    forwardTestCompletedWithGain10RealizedGain5 = {
        args: {
            ...forwardCompleted,
            orders: testOrders.ordersWithGain10RealizedTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(105),
            },
        },
        expected: expecteds.gain10RealizedGain5,
    } as InstanceSample,

    forwardTestCompletedWithGain10RealizedLose5 = {
        args: {
            ...forwardCompleted,
            orders: testOrders.ordersWithGain10RealizedTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(95),
            },
        },
        expected: expecteds.gain10RealizedLose5,
    } as InstanceSample,


    forwardTestCompletedWithLose10Realized = {
        args: {
            ...forwardCompleted,
            orders: testOrders.ordersWithLose10Realized,
        },
        expected: expecteds.lose10Realized,
    } as InstanceSample,


    forwardTestCompletedWithLose10RealizedLose5 = {
        args: {
            ...forwardCompleted,
            orders: testOrders.ordersWithLose10Realized,
            state: {
                prevPrice: num(100),
                latestPrice: num(100),
            },
        },
        expected: expecteds.lose10RealizedLose5,
    } as InstanceSample,

    forwardTestCompletedWithNoOrders = {
        args: {
            ...forward,
            orders: [],
        },
        expected: expecteds.noAction,
    } as InstanceSample,

    forwardTestCompletedWithSingleBuyLose10 = {
        args: {
            ...forwardCompleted,
            orders: testOrders.ordersWithSingleBuyTrailing,
            state: {
                prevPrice: num(100),
                latestPrice: num(90),
            },
        },
        expected: expecteds.singleBuyLose10,
    } as InstanceSample,



    foo = 5
    ;

const samples = {

    // Block A: Must mirror B
    backTestNew,
    backTestActiveGain10Realized,
    backTestActiveGain10RealizedGain0,
    backTestActiveGain10RealizedGain5,
    backTestActiveGain10RealizedLose5,

    backTestActiveNoOrders,
    backTestCompletedWithErrorAndNoOrders,
    backTestCompletedWithErrorGain10Realized,
    backTestCompletedWithGain10Realized,
    backTestCompletedWithGain10RealizedGain5,
    backTestCompletedWithGain10RealizedLose5,
    backTestCompletedWithLose10Realized,
    backTestCompletedWithLose10RealizedLose5,
    backTestCompletedWithNoOrders,
    backTestCompletedWithSingleBuyLose10,

    // Block B: Must mirror A
    forwardTestNew,
    forwardTestActiveGain10Realized,
    forwardTestActiveGain10RealizedGain0,
    forwardTestActiveGain10RealizedGain5,
    forwardTestActiveGain10RealizedLose5,

    forwardTestActiveNoOrders,
    forwardTestCompletedWithErrorAndNoOrders,
    forwardTestCompletedWithErrorGain10Realized,
    forwardTestCompletedWithGain10Realized,
    forwardTestCompletedWithGain10RealizedGain5,
    forwardTestCompletedWithGain10RealizedLose5,
    forwardTestCompletedWithLose10Realized,
    forwardTestCompletedWithLose10RealizedLose5,
    forwardTestCompletedWithNoOrders,
    forwardTestCompletedWithSingleBuyLose10,
};

export type InstanceSampleSet = typeof samples;
export { samples }
