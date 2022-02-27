import Big from "big.js";
import { BigNum, BigNumConstructor } from "./models/BigNum";
import { isNullOrUndefined } from "./utils";


// Strict mode so we don't accidentally make any bad numbers
// by passing in floating points. Types seems to missing this flag.
//(Big as any).strict = true;

// We don't want to use exponential notation at all.
Big.NE = -1e+6;
Big.PE = 1e+6;


export type NumLike = number | string | BigNum;

/**
 * Creates a BigNum from a number, string, or returns the value if it is already a BigNum.
 * @param numberLike 
 * @returns 
 */
function num(numberLike: NumLike): BigNum {
    if (isNullOrUndefined(numberLike)) {
        return BigNum("0");
    }
    else if (!isNaN(numberLike as number)) {
        return BigNum(numberLike.toString());
    }
    else if (numberLike instanceof BigNum) {
        return numberLike as BigNum;
    }
    else {
        throw new Error(`Unknown/invalid value '${numberLike}' does not map to a number`);
    }
}

export { BigNum, BigNum as Money, Big as BigNumConstructor, num };
