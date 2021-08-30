import { Chromosome } from "../../common/models/genetics/Chromosome";
import { Gene } from "../../common/models/genetics/Gene";
import { GeneticValueType } from "../../common/models/genetics/GeneticValueType";
import { GenomeParser } from "../../common-backend/genetics/GenomeParser";
import { GeneticService } from "../../common-backend/services/GeneticService";
import { Money } from "../../common/numbers";
import { TestDataCtx, getTestData } from "../utils/test-data";
import { assert, describe, before, env, it } from "../includes";
import { beforeEach } from "intern/lib/interfaces/tdd";
import { clone } from "../../common-backend/genetics/utils";
import { DEFAULT_GENETICS } from "../../common-backend/genetics/base";


describe("genetics", () => {
    let ctx: TestDataCtx = null;
    let gs = new GeneticService();
    let parser = new GenomeParser();

    before(async () => {
        ctx = await getTestData();
    });

    beforeEach(async () => {
        gs = new GeneticService();
        parser = new GenomeParser();
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

        it("allows custom genetics", async () => {
            const genetics = clone(DEFAULT_GENETICS, {
                "MONEY": new Chromosome("MONEY", "", "Just a test chromosome", [
                    new Gene("LIMIT", GeneticValueType.MONEY, Money("888"), "Test"),
                ]),
            });

            const raw = "MONEY-LIMIT=999";
            const { genome, warnings, errors } = parser.parse(raw, genetics);
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
            assert.throws(() => parser.parse(raw, genetics));
        });

    });
});

