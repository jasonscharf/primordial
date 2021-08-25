import { TestDataCtx, getTestData } from "./utils/test-data";
import { UserService } from "../common-backend/services/UserService";
import { assert, describe, before, env, it } from "./includes";
import { beforeEach } from "intern/lib/interfaces/tdd";

// Just a copy-paste stub for new suites. Delete this.

describe(UserService.name, () => {
    let ctx: TestDataCtx = null;
    let us: UserService = new UserService();

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(async () => {
        us = new UserService();
    });

    describe(us.getSystemUser.name, () => {
        it("does the thing right", async () => {
        });
    });
});
