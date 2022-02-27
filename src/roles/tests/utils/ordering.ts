import { constants } from "../../common-backend/includes";
import { BigNum, num } from "../../common/numbers";
import { Order, OrderState, OrderType } from "../../common/models/markets/Order";
import { isNullOrUndefined, randomString } from "../../common/utils";
import { TEST_DEFAULT_BASE, TEST_DEFAULT_QUOTE } from "../constants";
import { env } from "../includes";


const TEST_ORDER_DEFAULTS: Partial<Order> = {
    exchangeId: env.PRIMO_DEFAULT_EXCHANGE,
    typeId: OrderType.LIMIT_BUY,
    baseSymbolId: TEST_DEFAULT_BASE,
    quoteSymbolId: TEST_DEFAULT_QUOTE,
    fees: BigNum(constants.DEFAULT_EXCHANGE_FEE + ""),
    limit: BigNum("100"),
    strike: BigNum("100"),
    quantity: BigNum("1"),
    stateId: OrderState.CLOSED,
    price: BigNum("100"),
    extOrderId: randomString(),
};


const TEST_ORDER_PROPS_DEFAULT: Partial<TestOrderProps> = {
    price: 100,
    quantity: 1,
};


/**
 * Makes a test order, given some props to overlay on defaults.
 * @param orderProps 
 * @returns 
 */
export function makeTestOrder(orderProps: Partial<Order> = {}) {
    const appliedProps = Object.assign({}, TEST_ORDER_DEFAULTS, orderProps);
    let { gross: grossRaw, price: priceRaw, quantity: quantityRaw } = appliedProps;

    if (!isNullOrUndefined(priceRaw)) {
        appliedProps.price = num(priceRaw);
    }
    if (!isNullOrUndefined(quantityRaw)) {
        appliedProps.quantity = num(quantityRaw);
    }
    if (!isNullOrUndefined(grossRaw)) {
        appliedProps.gross = num(grossRaw);
    }

    if (isNullOrUndefined(appliedProps.gross)) {
        appliedProps.gross = appliedProps.quantity.mul(appliedProps.price).mul(appliedProps.typeId === OrderType.LIMIT_BUY ? "-1" : "1");
    }
    if (isNullOrUndefined(appliedProps.capital)) {
        appliedProps.capital = appliedProps.gross.abs();
    }
    return appliedProps;
}

/**
 * For convenience
 */
export interface TestOrderProps {
    price?: number | BigNum;
    quantity?: number | BigNum;
}

export function makeTestBuy(testProps: Partial<Order> = {}) {
    const appliedTestProps = Object.assign({}, TEST_ORDER_PROPS_DEFAULT, testProps, { typeId: OrderType.LIMIT_BUY });
    return appliedTestProps;
}

export function makeTestSell(testProps: Partial<Order> = {}) {
    const appliedTestProps = Object.assign({}, TEST_ORDER_PROPS_DEFAULT, testProps, { typeId: OrderType.LIMIT_SELL });
    return appliedTestProps;
}

// NOTE: These must alternate between buy and sell. Trailing buy is OK.
export const testOrders = {
    ordersWithSingleBuyTrailing: [
        makeTestBuy({ price: num(100) }),
    ],
    ordersWithGain10Realized: [
        makeTestBuy({ price: num(100) }),
        makeTestSell({ price: num(110) }),
    ],
    ordersWithGain10RealizedTrailing: [
        makeTestBuy({ price: num(100) }),
        makeTestSell({ price: num(110) }),
        makeTestBuy({ price: num(100) }),
    ],
    ordersWithLose10Realized: [
        makeTestBuy({ price: num(100) }),
        makeTestSell({ price: num(90) }),
    ],
    ordersWithLose10Trailing: [
        makeTestBuy({ price: num(100) }),
        makeTestSell({ price: num(90) }),
        makeTestBuy({ price: num(100) }),
    ],
    ordersWithBreakevenBeforeFees: [
        makeTestBuy({ price: num(100) }),
        makeTestSell({ price: num(100) }),
    ],
};
