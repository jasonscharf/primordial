import Big from "big.js";


// Strict mode so we don't accidentally make any bad numbers
// by passing in floating points. Types seems to missing this flag.
(Big as any).strict = true;

// We don't want to use exponential notation at all.
Big.NE = -1e+6;
Big.PE = 1e+6;


export { Big as Money }
