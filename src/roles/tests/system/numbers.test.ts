import "intern";
import Knex from "knex";
import { Big } from "big.js";
import { DateTime } from "luxon";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { SymbolService } from "../../common-backend/services/SymbolService";

import { BigNum } from "../../common/numbers";
import { TestDataCtx, getTestData, createTestPrice } from "../utils/test-data";
import { assert, describe, before, env, it } from "../includes";
import { assertRejects } from "../utils/async";

describe("numbers", () => {
    let ctx: TestDataCtx = null;
    let sym: SymbolService = new SymbolService();

    describe("money", () => {
        it("uses Big.js in strict mode", async (ctx) => {

            // Skipped until filters are implemented
            ctx.skip();

            // Nope; strict means we can't use filthy floating-points to create Big numbers.
            // Note: Typings issue here on `strict`.
            assert.isTrue((Big as any).strict);
            assert.equal(BigNum, Big as any);
        });

        it("throws when passed a number in the constructor", async (ctx) => {
            ctx.skip();

            const number = 42;
            assert.isNumber(number);

            // Fails. JS Number type is floating point an unsuitable for lossless representation.
            assert.throws(() => BigNum(1));

            // All good - string representations of numbers are lossless.
            const zero = Big("0");
            assert.equal(zero.toString(), "0");
        });

        it("can represent a value that JS cannot", async () => {
            const numberJs = 1.12345678901234567;
            const numberStr = "1.12345678901234567";
            const money = BigNum(numberStr);

            const roundedApprox = numberJs.toString();
            const moneyToStr = money.toString();

            assert.notEqual(roundedApprox, numberStr);
            assert.equal(moneyToStr, numberStr);
        });

        // Just a sanity - not going to overlap Big.js testing by testing all operators
        it("handles fractional addition correctly", async () => {
            const js = 0.1 + 0.2;
            const expectedJs = "0.30000000000000004";
            const expectedReality = "0.3";

            const [a, b] = ["0.1", "0.2"].map(v => BigNum(v));
            const big = a.plus(b);

            assert.equal(js.toString(), expectedJs);
            assert.equal(big.toString(), expectedReality);
        });
    });
});
