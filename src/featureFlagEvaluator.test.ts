import { FlagNotFoundError, Logger, ParseError } from "@openfeature/web-sdk";
import * as Contexts from "./testing/contexts";
import { silentLogger } from "./testing/logger";
import { FeatureFlagEvaluator } from "./featureFlagEvaluator";
import { ClientSideRule } from "./v4/clientSideRule";
import { ContextAttributeIsOneOfCondition } from "./v4/conditions/contextAttributeIsOneOfCondition";
import { ServerSideEvaluation } from "./v4/serverSideEvaluation";

// Evaluating a slug's rules is ServerSideEvaluation's job, covered in v4/serverSideEvaluation.test.ts
// and the condition tests. This covers what FeatureFlagEvaluator adds on top: slug lookup, the
// FlagNotFoundError contract, and the warn-once behaviour.
describe("FeatureFlagEvaluator", () => {
    function resolved(slug: string, value: boolean, reason: string): ServerSideEvaluation {
        return new ServerSideEvaluation(slug, value, reason);
    }

    function evaluatorFor(evaluations: readonly ServerSideEvaluation[], logger: Logger = silentLogger()): FeatureFlagEvaluator {
        return new FeatureFlagEvaluator({ evaluations, contentHash: "" }, logger);
    }

    describe("findEvaluationBySlug", () => {
        test("Finds an evaluation by exact slug", () => {
            const evaluation = resolved("my-feature", true, "The flag is enabled for this environment.");
            const evaluator = evaluatorFor([evaluation]);

            expect(evaluator.findEvaluationBySlug("my-feature")).toBe(evaluation);
        });

        test("Finds an evaluation when the slug casing differs", () => {
            const evaluation = resolved("my-feature", true, "The flag is enabled for this environment.");
            const evaluator = evaluatorFor([evaluation]);

            expect(evaluator.findEvaluationBySlug("My-Feature")).toBe(evaluation);
        });

        test("Does not find an evaluation for an unrecognised slug", () => {
            const evaluator = evaluatorFor([resolved("my-feature", true, "reason")]);

            expect(evaluator.findEvaluationBySlug("another-feature")).toBeUndefined();
        });

        test("An evaluation without a slug is never matched", () => {
            const evaluation = new ServerSideEvaluation(undefined as unknown as string, true, "reason");
            const evaluator = evaluatorFor([evaluation]);

            expect(evaluator.findEvaluationBySlug("undefined")).toBeUndefined();
        });
    });

    describe("evaluate", () => {
        test("Delegates a server-resolved evaluation, passing its value and reason through unchanged", () => {
            const evaluator = evaluatorFor([resolved("my-feature", true, "The flag is enabled for this environment.")]);

            expect(evaluator.evaluate("my-feature", {})).toEqual({ value: true, reason: "The flag is enabled for this environment." });
        });

        test("Delegates a deferred evaluation to its rules", () => {
            const evaluation = new ServerSideEvaluation("my-feature", undefined, undefined, Contexts.EvaluationKey, [
                new ClientSideRule("Beta ring", [new ContextAttributeIsOneOfCondition("ring", ["beta"])]),
            ]);
            const evaluator = evaluatorFor([evaluation]);

            const result = evaluator.evaluate("my-feature", Contexts.openFeature(undefined, { ring: "beta" }));

            expect(result).toEqual({ value: true, reason: "Matched rule 'Beta ring'." });
        });

        test("Looks the slug up case-insensitively", () => {
            const evaluator = evaluatorFor([resolved("my-feature", true, "The flag is enabled for this environment.")]);

            expect(evaluator.evaluate("MY-FEATURE", {})).toEqual({ value: true, reason: "The flag is enabled for this environment." });
        });

        test("Throws FlagNotFoundError for an unrecognised slug", () => {
            const evaluator = evaluatorFor([]);

            expect(() => evaluator.evaluate("missing-feature", {})).toThrow(
                new FlagNotFoundError("The slug provided did not match any of your Octopus Feature Flags. Please double check your slug and try again.")
            );
        });

        test("Propagates a ParseError from an unreadable evaluation", () => {
            const evaluation = new ServerSideEvaluation("my-feature", true); // value with no reason
            const evaluator = evaluatorFor([evaluation]);

            expect(() => evaluator.evaluate("my-feature", {})).toThrow(ParseError);
        });

        test("Warns only once for a repeated unrecognised slug", () => {
            const logger = silentLogger();
            const evaluator = evaluatorFor([], logger);

            expect(() => evaluator.evaluate("missing-feature", {})).toThrow(FlagNotFoundError);
            expect(() => evaluator.evaluate("missing-feature", {})).toThrow(FlagNotFoundError);
            expect(() => evaluator.evaluate("Missing-Feature", {})).toThrow(FlagNotFoundError);

            expect(logger.warn).toHaveBeenCalledTimes(1);
        });

        test("Warns again for a different unrecognised slug", () => {
            const logger = silentLogger();
            const evaluator = evaluatorFor([], logger);

            expect(() => evaluator.evaluate("missing-feature-a", {})).toThrow(FlagNotFoundError);
            expect(() => evaluator.evaluate("missing-feature-b", {})).toThrow(FlagNotFoundError);

            expect(logger.warn).toHaveBeenCalledTimes(2);
        });
    });
});
