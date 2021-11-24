import { Knex } from "knex";
import { capital, db, strats, users } from "../../common-backend/includes";
import { AllocationLedger } from "../../common-backend/services/CapitalService";
import { randomName } from "../../common-backend/utils/names";
import { isNullOrUndefined } from "../../common/utils";
import { TEST_DEFAULT_ADD_TEST_INSTANCE_ARGS, TEST_DEFAULT_NEW_BOT_DEF_PROPS, TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS } from "../constants";


/**
 * This is the primary method of creating and launching instances in tests.
 * By default, creates a new, uninitialized forward-test instance.
 * @param args 
 * @param defProps 
 * @param instanceProps 
 * @param trx 
 * @returns 
 */
export async function addTestInstance(args = TEST_DEFAULT_ADD_TEST_INSTANCE_ARGS, defProps = TEST_DEFAULT_NEW_BOT_DEF_PROPS, instanceProps = TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS, trx: Knex.Transaction = null) {
    trx = trx || await db.transaction();
    try {

        // Apply arg overlays
        const appliedArgs = Object.assign({}, TEST_DEFAULT_ADD_TEST_INSTANCE_ARGS, args);
        const appliedDefProps = Object.assign({}, TEST_DEFAULT_NEW_BOT_DEF_PROPS, defProps);
        const appliedInstanceProps = Object.assign({}, TEST_DEFAULT_NEW_BOT_INSTANCE_PROPS, instanceProps);

        const name = randomName();
        if (!appliedDefProps.name) { 
            appliedDefProps.name = appliedDefProps.displayName = name;
        }
        if (!appliedInstanceProps.name) {
            appliedInstanceProps.name = appliedInstanceProps.displayName = name;
        }
        if (!appliedInstanceProps.normalizedGenome) {
            appliedInstanceProps.normalizedGenome = appliedInstanceProps.currentGenome;
        }

        // Use the mode from the method args if not specified on instance
        if (isNullOrUndefined(instanceProps.modeId)) {
            instanceProps.modeId = appliedArgs.modeId;
        }

        // Setup workspace/strategy
        const user = await users.getSystemUser();
        const workspace = await strats.getDefaultWorkspaceForUser(user.id, user.id, trx);
        const strat = await strats.getOrCreateDefaultStrategy(workspace.id, user.id, trx);
        const existing = await strats.getBotDefinitionByName(workspace.id, name, trx);

        const workspaceId = workspace.id;

        if (!appliedDefProps.workspaceId) {
            appliedDefProps.workspaceId = workspaceId;
        }

        // Pluck from applied arguments
        let { budget, existingAllocationId, start } = appliedArgs;
        let modeId = instanceProps.modeId;

        if (!isNullOrUndefined(budget) && !isNullOrUndefined(existingAllocationId)) {
            throw new Error(`Budget and existing allocation ID specified. Choose one or the other.`);
        }


        // Setup bot ledger (for FWD tests)
        let ledger: AllocationLedger = null;

        if (isNullOrUndefined(existingAllocationId)) {
            ledger = await capital.createAllocationForBot(strat.id, budget);
        }
        else {
            ledger = await capital.getAllocationLedger(existingAllocationId);
        }

        const { alloc } = ledger;
        const def = await strats.addNewBotDefinition(strat.id, appliedDefProps, trx);
        const instance = await strats.createNewInstanceFromDef(def, appliedInstanceProps.resId, name, alloc.id, false, trx);

        if (start) {
            await strats.startBotInstance({ id: instance.id }, trx);
        }

        const run = await strats.getLatestRunForInstance(instance.id, trx);

        await trx.commit();

        return {
            def,
            instance,
            run,
        };
    }
    catch (err) {
        await trx.rollback();
        throw err;
    }
}