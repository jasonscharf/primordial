import { Knex } from "knex";
import { ApiForkGenotypeRequest, ApiForkGenotypeResponse } from "../../common/messages/genetic";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotMode } from "../../common/models/system/Strategy";
import { GenomeParser } from "../genetics/GenomeParser";
import { Mutation } from "../../common/models/genetics/Mutation";
import { MutationEntity } from "../../common/entities/MutationEntity";
import { MutationSet } from "../../common/models/genetics/MutationSet";
import { MutationSetEntity } from "../../common/entities/MutationSetEntity";
import { MutationSetType } from "../../common/models/genetics/MutationSetType";
import { RunState } from "../../common/models/system/RunState";
import { TimeResolution, SUPPORTED_TIME_RESOLUTIONS } from "../../common/models/markets/TimeResolution";
import { version } from "../../common/version";
import { queries, tables } from "../constants";
import { query } from "../database/utils";
import { genes, names } from "../genetics/base-genetics";
import { capital, db, genos, results, strats } from "../includes";
import { log } from "../logger";
import { randomName } from "../utils/names";
import * as validate from "../validation";
import { isNullOrUndefined } from "../utils";
import { defaultBaseGenetics, Genome } from "../../common/models/genetics/Genome";


export interface GenotypeForkArgs extends ApiForkGenotypeRequest {
    system: boolean;
}

export interface GenotypeForkResponse extends ApiForkGenotypeResponse {
    mutations: Mutation[];
    mutationSet: MutationSet;
}

export class GenotypeService {

    /**
     * Produces a new, altered "fork" of an existing instance.
     * Forking a genotype applies particular mutations, including top-level genes such as
     * symbols, time resolution, and bot type.
     * @param args 
     * @returns 
     */
    async fork(requestingUserId: string, args: GenotypeForkArgs, trx: Knex.Transaction = null): Promise<GenotypeForkResponse> {
        const newTransaction = !trx;
        trx = trx || await db.transaction();
        try {

            const {
                allocationId,
                displayName,
                modeId,
                mutations: rawMutations,
                parentId,
                strategyId,
                symbolPairs: symbols,
                system,
                typeId,
                workspaceId,
            } = args;

            if ((!rawMutations || rawMutations.length < 1) && (!symbols || symbols.length < 1)) {
                throw new Error(`No mutations specified`);
            }

            const parentInstance = await strats.getBotInstanceById(parentId, trx);
            validate.isNotNullOrUndefined(parentInstance, "parent");

            // SECURITY: Needs ruid
            const parentDef = await strats.getBotDefinitionById(workspaceId, parentInstance.definitionId, trx);
            if (!parentDef) {
                throw new Error(`Could not fork instance '${parentId}': Missing definition`);
            }

            // SECURITY: Needs ruid
            const allocation = await capital.getAllocationById(allocationId, trx);
            if (!allocation) {
                throw new Error(`Could not fork allocation '${parentId}': Missing allocation`);
            }

            // Annotate the MutationSet so we know what it's for
            const parentMode = parentInstance.modeId;
            const mutationType = this.computeMutationTypeFromModes(parentMode, modeId, system);


            // Ensure we don't run live bots with test allocations
            if (modeId === BotMode.LIVE || modeId === BotMode.LIVE_TEST) {
                if (!allocation.live) {
                    throw new Error(`Cannot fork to a live instance using a test allocation`);
                }
            }
            else if (modeId === BotMode.BACK_TEST || modeId === BotMode.FORWARD_TEST) {
                if (allocation.live) {
                    throw new Error(`Cannot fork to a test instance with a live allocation`);
                }
            }

            // Maintain topology between mutations
            const tempIds = new Map<string, string>();

            const name = randomName();
            const startInstance = true;
            const parsed = new GenomeParser();
            const { genome: parsedGenotype } = parsed.parse(parentInstance.currentGenome);

            // These are the forked instances we will create
            const unsavedInstances = new Map<Partial<Mutation>, Partial<BotInstance>>();


            // Are we elevating? Mutate the "META-MODE" gene so this fork can participate in future genetic analysis
            let elevationMutation: Partial<Mutation> = null;
            if (this.isElevating(mutationType)) {
                const modeChromo = names.GENETICS_C_META;
                const modeGene = names.GENETICS_C_META_G_MODE;
                const newGeno = parsedGenotype.copyWithMutation(names.GENETICS_C_META, names.GENETICS_C_META_G_MODE, modeId);

                elevationMutation = {
                    pid1: parentInstance.id,
                    raw: newGeno.overlaid.toString(),
                    chromo: modeChromo,
                    gene: modeGene,
                    value: modeId,
                };
            }

            // Produce mutation candidates
            const { original, mutations: unsavedMutations } = await this.produceMutations(parentInstance, args);

            // Track elevations, i.e. from backtest to fwd
            if (elevationMutation) {
                unsavedMutations.unshift(elevationMutation);
            }

            // Create a MutationSet, linking it to the instance's parent set
            const setProps: Partial<MutationSet> = {
                workspaceId,
                strategyId,
                psid: parentInstance.msid,
                type: mutationType,
                displayName: system ? `System` : `Manual`,
                ownerId: requestingUserId,
                meta: JSON.stringify(args),
                system,
            };
            const savedMutationSet = await this.createNewMutationSet(setProps, trx);


            // Create instances from mutations
            for (const m of unsavedMutations) {
                const overlay = new Genome(defaultBaseGenetics, m.raw);
                parsedGenotype.overlay(overlay.overlaidChromosomes);

                const possiblyMutatedResId = parsedGenotype.getGene<TimeResolution>(names.GENETICS_C_TIME, names.GENETICS_C_TIME_G_RES).value;
                //const possiblyMutatedSymbols = mutatedGenotype.getGene<string>(names.GENETICS_C_SYM, names.GENETICS_C_SYM).value;
                const possiblyMutatedSymbols = original.symbols.toUpperCase();

                const instanceProps: Partial<BotInstance> = {
                    //exchangeId: parentInstance.exchangeId,
                    definitionId: parentDef.id,
                    msid: savedMutationSet.id,
                    allocationId,
                    resId: possiblyMutatedResId,
                    typeId,
                    modeId,
                    name: randomName(),
                    runState: modeId === BotMode.BACK_TEST ? RunState.PAUSED : RunState.NEW,
                    build: version.full,
                    currentGenome: parsedGenotype.toString(),
                    symbols: possiblyMutatedSymbols,
                    stateJson: {} as any,
                    stateInternal: {} as any,
                    // TODO: Add parsed genotype to DB
                };

                unsavedInstances.set(m, instanceProps);
            }

            // TODO: Handle the case here where we have thousands of mutated instances to create.
            // TODO: Bulk/batch insert

            const ids: string[] = [];
            const savedMutations: Mutation[] = [];


            for (const pair of Array.from(unsavedInstances.entries())) {
                const [mutation, props] = pair;
                const savedInstance = await strats.createNewInstance(props, trx); 

                mutation.msid = savedMutationSet.id;
                mutation.chid = savedInstance.id;
                const savedMutation = await this.createNewMutation(mutation, trx);

                ids.push(savedInstance.id);
                savedMutations.push(savedMutation);
            }

            // TODO: support displayName setting
            if (newTransaction) {
                await trx.commit();
            }

            const result: GenotypeForkResponse = {
                ids,
                mutations: savedMutations,
                mutationSet: savedMutationSet,
            };
            return result;
        }
        catch (err) {
            if (newTransaction) {
                await trx.rollback();
            }
            log.error(`Error forking genotype`, err);
            throw err;
        }
    }

    computeMutationTypeFromModes(parentMode: BotMode, modeId: BotMode, system: boolean) {
        let mutationType: MutationSetType = null;
        if (parentMode === BotMode.BACK_TEST && modeId === BotMode.FORWARD_TEST) {
            mutationType = system
                ? MutationSetType.SYSTEM_ELEVATE_TO_FWD
                : MutationSetType.MANUAL_ELEVATE_TO_FWD
                ;
        }
        else if (parentMode === BotMode.BACK_TEST && modeId === BotMode.BACK_TEST) {
            mutationType = system
                ? MutationSetType.SYSTEM_BACK_TEST_MUTATE
                : MutationSetType.MANUAL_BACK_TEST_MUTATE
                ;
        }
        else if (parentMode === BotMode.FORWARD_TEST && modeId === BotMode.LIVE_TEST) {
            mutationType = system
                ? MutationSetType.SYSTEM_ELEVATE_TO_LIVE_TEST
                : MutationSetType.MANUAL_ELEVATE_TO_LIVE_TEST
                ;
        }

        // For safety, since this logic involves live instances
        if (isNullOrUndefined(mutationType)) {
            throw new Error(`Unknown/invalid mutation set type for ${parentMode} -> ${modeId} (system? ${system})`);
        }

        return mutationType;
    }

    /**
     * Derives new genotypes given some parameters for mutation.
     * @param original 
     * @param args 
     * @returns 
     */
    async produceMutations(original: BotInstance, args: GenotypeForkArgs): Promise<MutationResult> {
        const { currentGenome, resId, symbols: originalSymbols } = original;
        const { mutations: argMutations, overlayMutations, symbolPairs } = args;
        const parser = new GenomeParser();

        // 
        const genotypes: Genome[] = [];
        const mutationEntity: Mutation[] = [];

        // Seed the genetic pool with the original genotype
        const { genome: seed } = parser.parse(currentGenome);

        // Since we're not really using TIME-RES right now, set it so it can be mutated
        seed.setGene(names.GENETICS_C_TIME, names.GENETICS_C_TIME_G_RES, original.resId);
        genotypes.push(seed);

        let allMutations: Partial<Mutation>[] = [];

        // Mutate TIME-RES. This should be done by the specific genome in the longer term.
        if (argMutations && argMutations.indexOf(genes.META_TR) > -1) {
            const { mutations: timeResMutations } = await this.mutateTimeResolutions(parser, original, args, genotypes);
            allMutations = allMutations.concat(timeResMutations);
        }

        // TODO: Call out to chromosomes for mutations
        // TODO: Check stategy for live/live-test elevation permissions
        // TODO: Remove time-res and symbol genes from mutated genos, apply to instance instead.
        // TODO: Pull chromosome mutations from genomes (aside from time-res and symbols).

        const result: MutationResult = {
            original,
            mutations: allMutations,
        };

        return result;
    }

    async mutateTimeResolutions(parser: GenomeParser, original: BotInstance, args: GenotypeForkArgs, pool: Genome[]): Promise<MutationResult> {
        const { resId: originalResId } = original;

        const mutations: Partial<Mutation>[] = [];
        const genotypes: Genome[] = [];

        // NOTE: We mutate for all TimeResolutions here, including the same one as the original.
        //  This is because when the system derives backtested genotypes into mutations to backtest,
        //  it will alter the "from" and "to" to examine recent performance, and therefore should consider
        //  the original time res.
        const supportedResolutions = SUPPORTED_TIME_RESOLUTIONS;
        const chromo = names.GENETICS_C_TIME;
        const gene = names.GENETICS_C_TIME_G_RES;

        // TODO: Skip 1m for now?

        for (const g of pool) {
            supportedResolutions.forEach(value => {
                const genotype = g.copyWithMutation(chromo, gene, value);
                const mutation: Partial<Mutation> = {
                    pid1: original.id,
                    raw: genotype.overlaid.toString(),
                    chromo,
                    gene,
                    value,
                };

                mutations.push(mutation);
            });
        }

        const result: MutationResult = {
            original,
            mutations,
        };

        return result;
    }

    async createNewMutation(props: Partial<Mutation>, trx: Knex.Transaction = null): Promise<Mutation> {
        return query(queries.MUTATIONS_CREATE, async db => {
            const [row] = <Mutation[]>await db(tables.Mutations)
                .insert(props)
                .returning("*")
                ;
            return MutationEntity.fromRow(row);
        }, trx);
    }

    async createNewMutationSet(props: Partial<MutationSet>, trx: Knex.Transaction = null): Promise<MutationSet> {
        return query(queries.MUTATION_SETS_CREATE, async db => {
            const [row] = <Mutation[]>await db(tables.MutationSets)
                .insert(props)
                .returning("*")
                ;
            return MutationSetEntity.fromRow(row);
        }, trx);
    }

    isElevating(type: MutationSetType) {
        switch (type) {
            case MutationSetType.MANUAL_ELEVATE_TO_FWD:
            case MutationSetType.MANUAL_ELEVATE_TO_LIVE_TEST:
            case MutationSetType.MANUAL_ELEVATE_TO_LIVE:
            case MutationSetType.SYSTEM_ELEVATE_TO_FWD:
            case MutationSetType.SYSTEM_ELEVATE_TO_LIVE_TEST:
            case MutationSetType.SYSTEM_ELEVATE_TO_LIVE:
                return true;

            default:
                return false;
        }
    }
}

export interface MutationResult {
    original: BotInstance;
    mutations: Partial<Mutation>[];
}
