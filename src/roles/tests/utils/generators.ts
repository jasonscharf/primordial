import { BigNum } from "../../common/numbers";
import { TimeResolution } from "../../common/models/markets/TimeResolution";


export interface GeneratorArgs {
    res: TimeResolution;
    from: Date;
    to: Date;
    min?: number;
    max?: number;
    highPct?: number;
    lowPct?: number;
}

export interface WaveGeneratorArgs extends GeneratorArgs {
    freq: number;
    amp: number;
}

export const TEST_DEFAULT_GENERATOR_ARGS: Partial<GeneratorArgs> = {
    res: TimeResolution.ONE_MINUTE,
    highPct: 0.1,
    lowPct: -0.1,
    min: -1,
    max: 1,
};

export const TEST_DEFAULT_GENERATOR_ARGS_WAVE: Partial<WaveGeneratorArgs> = {
    ...TEST_DEFAULT_GENERATOR_ARGS,
    highPct: 0.1,
    lowPct: -0.1,
    freq: 1,
    amp: 1,
};

export function signum(num: number | BigNum): number {
    if (num instanceof BigNum) {
        if (num.gt("0")) {
            return 1;
        }
        else if (num.lt("0")) {
            return -1;
        }
        else {
            return 0;
        }
    }
    else {
        if (num > 0) {
            return 1;
        }
        else if (num < 0) {
            return -1;
        }
        else {
            return 0;
        }
    }
}


export function squareWaveGeneratorFactory(args: Partial<GeneratorArgs>) {
    const appliedArgs = Object.assign({}, TEST_DEFAULT_GENERATOR_ARGS_WAVE, args);
    const { amp, freq, from, highPct, lowPct, to } = appliedArgs;

    if (!from || !to) {
        throw new Error(`Missing from or to params`);
    }

    const durationMs = (to.getTime() - from.getTime());
    if (durationMs < 0) {
        throw new Error(`Invalidation duration. Check from or to args`);
    }

    const numPeriods = Math.round(durationMs / freq);
    const periodLen = Math.round(durationMs / numPeriods);

    console.log(`Period length ${numPeriods}`);

    const generator = (ts: Date) => {
        const period = Math.round((ts.getTime() - from.getTime() / numPeriods));
        console.log(`Periods ${numPeriods} Period: ${period}`);

        // TODO: Finish this
    };

    return generator;
}
