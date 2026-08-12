import { EvaluationContext, ParseError } from "@openfeature/web-sdk";
import * as Contexts from "../../testing/contexts";
import { parseCondition } from "./parseCondition";
import { PercentageByContextCondition } from "./percentageByContextCondition";

describe("PercentageByContextCondition", () => {
    describe("deserialisation", () => {
        test("Deserialises to its concrete type", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": 50 }`));

            expect(condition).toStrictEqual(new PercentageByContextCondition(50));
        });

        test("Reads an absent percentage as undefined, keeping it distinguishable from an explicit 0", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context" }`));

            expect(condition).toStrictEqual(new PercentageByContextCondition(undefined));
        });

        test("Preserves an explicit percentage of 0", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": 0 }`));

            expect(condition).toStrictEqual(new PercentageByContextCondition(0));
        });

        test("Reads a percentage that is not a number as undefined", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": "fifty" }`));

            expect(condition).toStrictEqual(new PercentageByContextCondition(undefined));
        });

        test("Reads a fractional percentage as undefined, as the wire contract is an integer", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": 50.5 }`));

            expect(condition).toStrictEqual(new PercentageByContextCondition(undefined));
        });

        test("Preserves a percentage outside the range, which evaluation reports rather than parsing", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": 101 }`));

            expect(condition).toStrictEqual(new PercentageByContextCondition(101));
        });

        test("Ignores properties it does not model, including the discriminator", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": 50, "cats": "dogs" }`));

            expect(condition).toStrictEqual(new PercentageByContextCondition(50));
        });
    });

    describe("matches", () => {
        test("A targeting key inside the rollout matches", () => {
            const condition = new PercentageByContextCondition(Contexts.TargetingKeyBucket);

            expect(condition.matches(Contexts.forRules(Contexts.TargetingKey))).toBe(true);
        });

        test("A targeting key outside the rollout does not match", () => {
            const condition = new PercentageByContextCondition(Contexts.TargetingKeyBucket - 1);

            expect(condition.matches(Contexts.forRules(Contexts.TargetingKey))).toBe(false);
        });

        test("Nothing matches at 0%, as the lowest bucket is 1", () => {
            expect(new PercentageByContextCondition(0).matches(Contexts.forRules(Contexts.TargetingKey))).toBe(false);
        });

        test("Without a targeting key, only a full rollout matches", () => {
            expect(new PercentageByContextCondition(100).matches(Contexts.forRules())).toBe(true);
            expect(new PercentageByContextCondition(99).matches(Contexts.forRules())).toBe(false);
            expect(new PercentageByContextCondition(50).matches(Contexts.forRules(""))).toBe(false);
        });

        test("With no context at all, only a full rollout matches", () => {
            expect(new PercentageByContextCondition(100).matches(Contexts.withoutOpenFeatureContext())).toBe(true);
            expect(new PercentageByContextCondition(99).matches(Contexts.withoutOpenFeatureContext())).toBe(false);
        });

        // Cast rather than built by the helpers: the declared type rules a null out, so it only arrives
        // from an untyped JavaScript caller. Absent rather than something to bucket on, as the .NET and
        // Java providers treat it — hashing it would bucket every such caller on the string "null".
        test("A null targeting key is treated as absent, not hashed", () => {
            const context = { evaluationKey: Contexts.EvaluationKey, openFeatureContext: { targetingKey: null } as unknown as EvaluationContext };

            expect(new PercentageByContextCondition(100).matches(context)).toBe(true);
            expect(new PercentageByContextCondition(99).matches(context)).toBe(false);
        });

        test.each([
            [undefined, "A condition is missing a percentage value."],
            [101, "A condition has a percentage of 101."],
            [-1, "A condition has a percentage of -1."],
        ])("An absent or out-of-range percentage of %s throws a parse error", (percentage, expectedProblem) => {
            const condition = new PercentageByContextCondition(percentage);

            expect(() => condition.matches(Contexts.forRules(Contexts.TargetingKey))).toThrow(new ParseError(expectedProblem));
        });
    });
});
