import { Knex } from "knex";
import { ApiForkGenotypeRequest, ApiForkGenotypeResponse } from "../../common/messages/genetic";
import { BotInstance } from "../../common/models/bots/BotInstance";
import { BotInstanceEntity } from "../../common/entities/BotInstanceEntity";
import { Genome } from "../../common/models/genetics/Genome";
import { GenomeParser } from "../genetics/GenomeParser";
import { Mutation } from "../../common/models/genetics/Mutation";
import { MutationEntity } from "../../common/entities/MutationEntity";
import { RunState } from "../../common/models/system/RunState";
import { TimeResolution } from "../../common/models/markets/TimeResolution";
import { version } from "../../common/version";
import { queries, tables } from "../constants";
import { query } from "../database/utils";
import { names } from "../genetics/base-genetics";
import { capital, db, genos, results, strats } from "../includes";
import { log } from "../logger";
import { randomName } from "../utils/names";
import * as validate from "../validation";


export interface GenotypeForkArgs extends ApiForkGenotypeRequest {
}

export interface GenotypeForkResponse extends ApiForkGenotypeResponse {
    mutations: Mutation[];
}

export class GenotypeService {

    /**
     * Produces a new, altered "fork" of an existing instance.
     * Forking a genotype applies particular mutations, including top-level genes such as
     * symbols, time resolution, and bot type.
     * @param args 
     * @returns 
     */
    async fork(args: GenotypeForkArgs, trx: Knex.Transaction = null): Promise<GenotypeForkResponse> {
        const newTransaction = !trx;
        trx = trx || await db.transaction();
        try {

            const { allocationId, displayName, modeId, mutations: rawMutations, parentId, res, strategyId, symbolPairs: symbols, typeId, workspaceId } = args;

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


            // ... validate state logic with allocation


            const name = randomName();
            const startInstance = true;
            const parsed = new GenomeParser();
            const { genome: parsedGenotype } = parsed.parse(parentInstance.currentGenome);



            // Produce mutation candidates
            const { original, mutations: unsavedMutations } = await this.produceMutations(parentInstance, args);

            const unsavedInstances = new Map<Partial<Mutation>, Partial<BotInstance>>();


            // Create instances from mutations
            for (const m of unsavedMutations) {
                const overlay = m.overlay;
                parsedGenotype.overlay(overlay.overlaidChromosomes);

                const possiblyMutatedResId = parsedGenotype.getGene<TimeResolution>(names.GENETICS_C_TIME, names.GENETICS_C_TIME_G_RES).value;
                //const possiblyMutatedSymbols = mutatedGenotype.getGene<string>(names.GENETICS_C_SYM, names.GENETICS_C_SYM).value;
                const possiblyMutatedSymbols = original.symbols.toUpperCase();

                const instanceProps: Partial<BotInstance> = {
                    exchangeId: parentInstance.exchangeId,
                    definitionId: parentDef.id,
                    allocationId,
                    resId: possiblyMutatedResId,
                    typeId,
                    modeId,
                    name: randomName(),
                    runState: RunState.NEW,
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

                mutation.childId = savedInstance.id;
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

    /**
     * Derives new genotypes given some parameters for mutation.
     * @param original 
     * @param args 
     * @returns 
     */
    async produceMutations(original: BotInstance, args: GenotypeForkArgs): Promise<MutationResult> {
        const { currentGenome, resId, symbols: originalSymbols } = original;
        const { mutations, overlayMutations, res, symbolPairs } = args;
        const parser = new GenomeParser();

        // 
        const genotypes: Genome[] = [];
        const mutationEntity: Mutation[] = [];

        // Seed the genetic pool with the original genotype
        const { genome: seed } = parser.parse(currentGenome);

        // Since we're not really using TIME-RES right now, set it so it can be mutated
        seed.setGene(names.GENETICS_C_TIME, names.GENETICS_C_TIME_G_RES, original.resId);
        genotypes.push(seed);

        // Mutate TIME-RES
        const { mutations: timeResMutations } = await this.mutateTimeResolutions(parser, original, args, genotypes);
        const allMutations = timeResMutations.concat();

        // Mutate SYMBOLS

        // TODO: Remove time-res and symbol genes from mutated genos, apply to instance instead.

        // TODO: Pull chromosome mutations from genomes (aside from time-res and symbols).
        const result: MutationResult = {
            original,
            mutations: allMutations,
        };

        return result;
    }

    async mutateTimeResolutions(parser: GenomeParser, original: BotInstance, args: GenotypeForkArgs, pool: Genome[]) {
        const { resId: originalResId } = original;

        const mutations: Partial<Mutation>[] = [];
        const genotypes: Genome[] = [];

        // NOTE: We mutate for all TimeResolutions here, including the same one as the original.
        //  This is because when the system derives backtested genotypes into mutations to backtest,
        //  it will alter the "from" and "to" to examine recent performance, and therefore should consider
        //  the original time res.
        const supportedResolutions: TimeResolution[] = Object.keys(TimeResolution).map(k => TimeResolution[k]);
        const chromo = names.GENETICS_C_TIME;
        const gene = names.GENETICS_C_TIME_G_RES;

        // TODO: Skip 1m for now?

        for (const g of pool) {
            supportedResolutions.forEach(value => {
                const genotype = g.copyWithMutation(chromo, gene, value);
                const mutation: Partial<Mutation> = {
                    parentId1: original.id,
                    overlay: genotype.overlaid,
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
}

export interface MutationResult {
    original: BotInstance;
    mutations: Partial<Mutation>[];
}
