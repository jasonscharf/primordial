import { Chromosome } from "../../common/models/genetics/Chromosome";
import { Gene } from "../../common/models/genetics/Gene";
import { GeneticValueType } from "../../common/models/genetics/GeneticValueType";
import { GenomeParser } from "../../common-backend/genetics/GenomeParser";
import { GenotypeService } from "../../common-backend/services/GenotypeService";
import { Money } from "../../common/numbers";
import { TestDataCtx, getTestData } from "../utils/test-data";
import { assert, describe, before, env, it } from "../includes";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { clone } from "../../common-backend/genetics/utils";
import { DEFAULT_GENETICS, names } from "../../common-backend/genetics/base-genetics";
import { defaultBaseGenetics, Genome } from "../../common/models/genetics/Genome";
import { assertRejects } from "../utils/async";


describe("genetics", () => {
    let ctx: TestDataCtx = null;
    let gs = new GenotypeService();
    let gt = new Genome();
    let parser = new GenomeParser();
    const testValue = 888;

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(async () => {
        gs = new GenotypeService();
        parser = new GenomeParser();
    });


    //
    // TODO: IMPORTANT: Need to test:
    // - shorthand activation of chromosomes and ensure default active/inactive genes preserve their state
    // - need to account for the use case of everything using "getGene" everywhere...even if the parent chromo is inactive
    //

    describe(Genome.name, () => {
        it("uses a frozen base genome", async () => {
            await assertRejects(() => defaultBaseGenetics.setGene(names.GENETICS_C_RSI, names.GENETICS_C_RSI_G_L, testValue));

            const gene = defaultBaseGenetics.getGene<number>(names.GENETICS_C_RSI, names.GENETICS_C_RSI_G_L);
            assert.notEqual(gene.value, testValue);
        });

        it("does not alter the base genetics", async () => {
            // TEST
            const genome = new Genome(defaultBaseGenetics);
            const gene = genome.getGene<number>(names.GENETICS_C_RSI, names.GENETICS_C_RSI_G_L);
            gene.value = testValue;

            const rawBase = DEFAULT_GENETICS[names.GENETICS_C_RSI];
            assert.notEqual(rawBase.getGene<number>(names.GENETICS_C_RSI_G_L).value, testValue);
        });

        it("activates the appropriate genes when activating chromosomes by shorthand", async () => {
            // TEST: Verify that toggling on "HA" or "RSI" actives subgenes marked as active by default
        });

        describe("construction", () => {
            it("inherits from a base genome", async () => {
                const genome = new Genome(defaultBaseGenetics);
                const gene = genome.getGene<number>(names.GENETICS_C_RSI, names.GENETICS_C_RSI_G_L);
                assert.exists(gene);

                const { defaultValue, value } = gene;
                assert.isNumber(defaultValue);
                assert.isNumber(value);
            });

            it("can be constructed with a string", async () => {
                const genome = new Genome(defaultBaseGenetics, "RSI-H=888|HA|BOLL");
                const rsiGene = genome.getGene<number>(names.GENETICS_C_RSI, names.GENETICS_C_RSI_G_H);
                const haChromo = genome.getChromo(names.GENETICS_C_HEIKIN_ASHI);
                const bollChromo = genome.getChromo(names.GENETICS_C_BOLL); 

                assert.exists(rsiGene);
                assert.exists(haChromo);
                assert.exists(bollChromo);

                const all = genome.chromosomesAll;
                assert.lengthOf(all, Object.keys(DEFAULT_GENETICS).length);

                const active = genome.chromosomesEnabled;
                assert.lengthOf(active, 3);
            });
        });

        describe(gt.copyWithMutation.name, () => {
            it("produces a distinct new copy of the genome and altered genes", async () => {
                const genome = new Genome(defaultBaseGenetics);
                const baseGene = genome.getGene<number>(names.GENETICS_C_RSI, names.GENETICS_C_RSI_G_L);

                const genomeCopy = genome.copyWithMutation(names.GENETICS_C_RSI, names.GENETICS_C_RSI_G_L, testValue);
                const copyGene = genomeCopy.getGene<number>(names.GENETICS_C_RSI, names.GENETICS_C_RSI_G_L);

                assert.notEqual(baseGene, copyGene);
                assert.equal(copyGene.value, testValue);
            });

            it("applies the specified mutation", async () => {
                // TEST
            });

            it("correctly copies chromosomes activated by shorthand", async () => {
                // TEST
            });
        });

        describe(gt.overlay.name, () => {
            it("modifies the genome but not the base", async () => {
                // TEST
            });
        });
    });

    describe(parser.parse.name, () => {
        it("throws on unknown gene", async () => {
            const raw = "BANANACAT";
            assert.throws(() => parser.parse(raw));
        });

        it("throws on unknown character in separator position", async () => {
            const raw = "TIME-RES=15m^";
            assert.throws(() => parser.parse(raw));
        });

        it("throws on extra character in gene/family position", async () => {
            const raw = "TIME--RES=15m";
            assert.throws(() => parser.parse(raw));
        });

        it("throws on extra space in gene/family position", async () => {
            const raw = "TIME -RES=15m";
            assert.throws(() => parser.parse(raw));
        });

        it("throws on invalid/unknown TimeResolutions", async () => {
            const raw = "TIME-RES=3fortnights";
            assert.throws(() => parser.parse(raw));
        });

        it("throws on whitespace in front of an assignment operator", async () => {
            const raw = "TIME-RES =1m";
            assert.throws(() => parser.parse(raw));
        });

        it("throws on whitespace around an assignment operator", async () => {
            const raw = "TIME-RES = 1m";
            assert.throws(() => parser.parse(raw));
        });

        it("allows an empty string, but with a warrning", async => {
            const raw = "";
            const { genome, warnings, errors } = parser.parse(raw);

            assert.exists(genome);
            assert.lengthOf(errors, 0);
            assert.lengthOf(warnings, 1);
        });

        it("accepts leading and trailing whitespace", async () => {
            const raw = "    TIME-RES=1m|RSI-H=66   ";
            const { genome, warnings, errors } = parser.parse(raw);
            assert.exists(genome);
            assert.lengthOf(warnings, 0);
            assert.lengthOf(errors, 0);
        });

        it("accepts leading and trailing whitespace around seperators", async () => {
            const raw = "    TIME-RES=1m | RSI-H=66   ";
            const { genome, warnings, errors } = parser.parse(raw);
            assert.exists(genome);
            assert.lengthOf(warnings, 0);
            assert.lengthOf(errors, 0);
        });

        it("isn't case sensitive but emits a warning", ctx => {
            ctx.skip();
            const raw = "time-res=1";
            const { genome, warnings, errors } = parser.parse(raw);
            assert.exists(genome);
            assert.lengthOf(warnings, 1);
            assert.lengthOf(errors, 0);
        });

        it("produces a valid genotype from a valid genome", async () => {
            const raw = "TIME-RES=1m|RSI-H=66|BOLL-BB";
            const { genome, warnings, errors } = parser.parse(raw);
            assert.exists(genome);
            const { chromosomesAll, chromosomesEnabled } = genome;
            assert.equal(chromosomesAll.length, Object.keys(DEFAULT_GENETICS).length);
            assert.equal(chromosomesEnabled.length, 3);
        });

        it("correctly overlays genes on the base", async () => {
            const baseGene = DEFAULT_GENETICS["RSI"].getGene("L");
            assert.exists(baseGene);
            assert.equal(baseGene.defaultValue, 33);
            assert.isFalse(baseGene.active);
            assert.isNull(baseGene.value, null);

            const raw = "RSI-L=20";
            const { genome, warnings, errors } = parser.parse(raw);
            const { chromosomesAll, chromosomesEnabled } = genome;
            assert.lengthOf(chromosomesEnabled, 1);
            const overlaidGene = genome.getGene("RSI", "L");
            assert.exists(overlaidGene);
            assert.equal(overlaidGene.value, 20);
            assert.equal(overlaidGene.defaultValue, baseGene.defaultValue);
            assert.equal(overlaidGene.name, baseGene.name);
            assert.equal(overlaidGene.type, baseGene.type);
            assert.equal(overlaidGene.desc, baseGene.desc);
            assert.isTrue(overlaidGene.active);
        });

        // Functionality disabled for now
        it("allows custom genetics", async (ctx) => {
            ctx.skip();
            const genetics = clone(DEFAULT_GENETICS, {
                "MONEY": new Chromosome("MONEY", "", "Just a test chromosome", [
                    new Gene("LIMIT", GeneticValueType.MONEY, Money("888"), "Test"),
                ]),
            });

            const raw = "MONEY-LIMIT=999";
            const { genome, warnings, errors } = parser.parse(raw, defaultBaseGenetics);
            assert.exists(genome);
            assert.lengthOf(warnings, 0);
            assert.lengthOf(errors, 0);
            const { chromosomesAll, chromosomesEnabled } = genome;

            assert.lengthOf(chromosomesEnabled, 1);
            const [chromo] = chromosomesEnabled;
            {
                const gene = chromo.getGene("LIMIT");
                assert.exists(gene);
                const { defaultValue, name, value } = gene;
                assert.equal(name, "LIMIT");
                assert.equal(value.toString(), "999");
                assert.equal(defaultValue.toString(), "888");
            }
            {
                const gene = genome.getGene("MONEY", "LIMIT");
                const { defaultValue, name, value } = gene;
                assert.equal(name, "LIMIT");
                assert.equal(value.toString(), "999");
                assert.equal(defaultValue.toString(), "888");
            }
        });

        it("throws on invalid monetary values", async () => {
            const genetics = clone(DEFAULT_GENETICS, {
                "MONEY": new Chromosome("MONEY", "888", "Just a test chromosome", [
                    new Gene("LIMIT", GeneticValueType.MONEY, "0.0", "Test"),
                ]),
            });
            const raw = "MONEY-LIMIT=POTATO";
            assert.throws(() => parser.parse(raw, defaultBaseGenetics));
        });
    });
});

