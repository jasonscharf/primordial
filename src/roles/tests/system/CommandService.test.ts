import { CommandService } from "../../common-backend/services/CommandService";
import { TestDataCtx, getTestData } from "../utils/test-data";
import { assert, describe, before, env, it } from "../includes";
import { beforeEach } from "intern/lib/interfaces/tdd";


describe(CommandService.name, () => {
    let ctx: TestDataCtx = null;
    let cs: CommandService = new CommandService();

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(async () => {
        cs = new CommandService();
    });

    describe(cs.execute.name, () => {
        it("does the thing right", async () => {
        });
    });

    describe(cs.getHandler.name, () => {
        it("does the thing right", async () => {
        });
    });

    describe(cs.registerHandler.name, () => {
        it("does the thing right", async () => {
        });
    });
});
