import { SpoolerTask } from "../../common/models/system/SpoolerTask";
import { SpoolerTaskHandler } from "../../common-backend/system/SpoolerTaskHandler";
import { SpoolerTaskEntity } from "../../common/entities/SpoolerTaskEntity";
import { SpoolerService } from "../../common-backend/services/SpoolerService";
import { TestDataCtx, getTestData } from "../utils/test-data";
import { assert, describe, before, env, it } from "../includes";
import { assertRejects } from "../utils/async";
import { beforeEach } from "intern/lib/interfaces/tdd";


describe(SpoolerService.name, () => {
    let ctx: TestDataCtx = null;
    let spool: SpoolerService = new SpoolerService();

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(() => {
        spool = new SpoolerService();
    });


    function createTestTask(props?: Partial<SpoolerTask>) {
        const baseProps: Partial<SpoolerTask> = {
            displayName: `test-task`,
            frequencySeconds: 0,
            name: `test-task-${Math.random()}`,
        };
        return Object.assign({}, baseProps, props);
    }

    async function addTestTask(props?: Partial<SpoolerTask>) {
        return spool.addTask(createTestTask(props));
    }


    describe(spool.addTask.name, () => {
        it("adds a task to the DB", async () => {
            const props: Partial<SpoolerTask> = {
                displayName: spool.addTask.name,
                frequencySeconds: 0,
                name: `test ${spool.addTask.name}`,
            };

            const res = await spool.addTask(props);
            assert.exists(res);
            assert.isString(res.id);
            assert.equal(res.name, props.name);
            assert.isNull(res.prevRun);
            assert.isNull(res.lastError);
            assert.equal(res.displayName, props.displayName);
        });

        it("allows multiple scheduled task runs for the same name", async () => {
            const name = "bork";

            const t1 = createTestTask({ name });
            const t2 = createTestTask({ name });

            await spool.addTask(t1);
            await spool.addTask(t2);
        });
    });

    describe(spool.getHandler.name, () => {
        it("throws on unknown handler", async () => {
            await assertRejects(() => spool.getHandler("nonexistent-name" + Math.random()));
        });

        it("throws on duplicate handler", async () => {
            const dummyName = "update-stonk-prices";
            const handler = (s, p) => s;
            spool.registerHandler(dummyName, handler);
        });

        it("returns correct handler", async () => {
            const dummyName = "update-stonk-prices-2";
            const handler = (s, p) => s;
            spool.registerHandler(dummyName, handler);

            const returned = spool.getHandler(dummyName);
            assert.equal(handler, returned);
        });
    });

    describe(spool.runTask.name, () => {
        it("throws on missing ID", async () => {
            await assertRejects(() => {
                const task = createTestTask({
                    id: null,
                });
                return spool.runTask(task as SpoolerTaskEntity);
            });
        });
        it("throws on unknown task name", async () => {
            await assertRejects(() => {
                const task = createTestTask({
                    id: "dummy-id",
                    name: "wat?",
                });
                return spool.runTask(task as SpoolerTaskEntity);
            });
        });

        it("can run a task", async () => {
            const name = "tasky-task";

            // Create the DB record
            const taskProps = createTestTask({
                name,
            });

            let handlerRuns = 0;

            // Create the handler
            const handler: SpoolerTaskHandler = (state) => {
                {
                    runs: ++handlerRuns;
                }
            }

            spool.registerHandler(name, handler);

            const savedTask = await spool.addTask(taskProps);

            const pending = await spool.getPendingTasks();
            assert.ok(pending.length > 0);

            const contains = pending.some(p => p.name == taskProps.name);
            assert.isTrue(contains);

            await spool.runTask(savedTask);
            assert.equal(handlerRuns, 1);
        });

        it("updates the nextRun, prevRun and runCount fields", async () => {
            const task = await addTestTask({ frequencySeconds: 24 * 60 });

            assert.isNull(task.prevRun);
            assert.equal(task.runCount, 0);

            interface TestHandlerState {
                arbitraryState: boolean;
            }

            spool.registerHandler(task.name, (s: TestHandlerState) => {
                return (<TestHandlerState>{
                    arbitraryState: true
                });
            });

            const result = await spool.runTask<TestHandlerState>(task);
            assert.equal(result.arbitraryState, true);
            const taskAfterRun = await spool.getTask(task.id);

            assert.isNotNull(taskAfterRun.nextRun);
            assert.isNotNull(taskAfterRun.prevRun);
            assert.isFalse(taskAfterRun.isRunning);
            assert.equal(taskAfterRun.runCount, 1);
        });
    });

    describe(spool.getPendingTasks.name, () => {

        // TODO: Random task name, use in callbacks
        const taskName = spool.getPendingTasks.name;

        const taskImpl: SpoolerTaskHandler = (state) => {
            return state;
        };

        spool.registerHandler(taskName, taskImpl);

        let runOnceTask: SpoolerTaskEntity;
        let runEvery10: SpoolerTaskEntity;
        let runEvery20: SpoolerTaskEntity;
        let runEvery30: SpoolerTaskEntity;

        before(async () => {
            spool = new SpoolerService();

            const t0 = createTestTask({
                displayName: "Run once",
                frequencySeconds: 0,
            });

            const t1 = createTestTask({
                displayName: "Run every 10 seconds",
                frequencySeconds: 10,
            });

            const t2 = createTestTask({
                displayName: "Run every 20 seconds",
                frequencySeconds: 20,
            });

            const t3 = createTestTask({
                displayName: "Run every 30 seconds",
                frequencySeconds: 30,
            });

            // Intentionally insert OoO
            runOnceTask = await spool.addTask(t0);
            runEvery30 = await spool.addTask(t3);
            runEvery10 = await spool.addTask(t1);
            runEvery20 = await spool.addTask(t2);
        });

        it("runs a task with 0 frequency once and only once", async () => {
            let count = 0;
            const newState = { count };
            spool.registerHandler(runOnceTask.name, () => ++count);
            const output = await spool.runTask(runOnceTask);

            assert.equal(count, 1);

            await assertRejects(() => spool.runTask(runOnceTask));
        });
    });

    describe(spool.hasAnyTasks.name, () => {
        it("returns false when there are no tasks", async () => {
        });

        it("returns true when there are any tasks", async () => {
        });
    });

    // TODO: Task scheduling/handling is mission critical and
    // needs to be tested once ported into here from the spooler role.
});
