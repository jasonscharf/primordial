import { TestDataCtx, getTestData } from "../utils/test-data";
import { UserService } from "../../common-backend/services/UserService";
import { assert, describe, before, env, it } from "../includes";
import { beforeEach } from "intern/lib/interfaces/tdd";


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
        it("returns the oldest user account in dev/test", async () => {
            // TEST
        });
    });

    describe(us.insertUser.name, () => {
        it("does the thing right", async () => {
            // TEST
        });
    });

    describe(us.insertUserAndIdentity.name, () => {
        it("does the thing right", async () => {
            // TEST
        });
    });

    describe(us.updateUser.name, () => {
        it("does the thing right", async () => {
            // TEST
        });
    });
});
