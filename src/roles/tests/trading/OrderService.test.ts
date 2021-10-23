import "intern";
import { it } from "intern/lib/interfaces/bdd";
import { before, beforeEach } from "intern/lib/interfaces/tdd";
import env from "../../common-backend/env";
import { OrderService } from "../../common-backend/services/OrderService";
import { describe } from "../includes";
import { getTestData, TestDataCtx } from "../utils/test-data";


describe(OrderService.name, () => {
    const exchange = env.PRIMO_DEFAULT_EXCHANGE;
    const symbolPair = "BTC/USD";
    let ctx: TestDataCtx = null;
    let orders: OrderService = new OrderService();


    before(async () => ctx = await getTestData());
    beforeEach(async () => orders = new OrderService());


    describe(orders.addOrderToDatabase.name, () => {
        it("places an order in the database", async () => {
            // TEST
        });
    });
    describe(orders.updateOrder.name, () => {
        it("updates an order in the database by ID", async () => {
            // TEST
        });
    });
    describe(orders.getBotOrderDescriptors.name, () => {
        it("retrieves the requested number of order descriptors", async () => {
            // TEST
        });
    });
    describe(orders.saveFillsForOrder.name, () => {
        it("saves fill records in the database", async () => {
            // TEST
        });
    });
    describe(orders.saveFeeForOrder.name, () => {
        it("saves a fee record into the database", async () => {
            // TEST
        });
    });
});