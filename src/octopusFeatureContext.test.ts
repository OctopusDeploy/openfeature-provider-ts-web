import { FlagNotFoundError, ParseError } from "@openfeature/web-sdk";
import * as Contexts from "./testing/contexts";
import { silentLogger } from "./testing/logger";
import { OctopusFeatureContext } from "./octopusFeatureContext";
import { ClientSideRule } from "./v4/clientSideRule";
import { ContextAttributeIsOneOfCondition } from "./v4/conditions/contextAttributeIsOneOfCondition";
import { ServerSideEvaluation } from "./v4/serverSideEvaluation";

// Evaluating a slug's rules is ServerSideEvaluation's job, covered in v4/serverSideEvaluation.test.ts
// and the condition tests. This covers what OctopusFeatureContext adds on top: slug lookup, the
// FlagNotFoundError contract, and the warn-once behaviour.
describe("OctopusFeatureContext", () => {
    function resolved(slug: string, value: boolean, reason: string): ServerSideEvaluation {
        return new ServerSideEvaluation(slug, value, reason);
    }

    describe("findToggleBySlug", () => {
        test("Finds an evaluation by exact slug", () => {
            const evaluation = resolved("my-feature", true, "The flag is enabled for this environment.");
            const context = new OctopusFeatureContext([evaluation], silentLogger());

            expect(context.findToggleBySlug("my-feature")).toBe(evaluation);
        });

        test("Finds an evaluation when the slug casing differs", () => {
            const evaluation = resolved("my-feature", true, "The flag is enabled for this environment.");
            const context = new OctopusFeatureContext([evaluation], silentLogger());

            expect(context.findToggleBySlug("My-Feature")).toBe(evaluation);
        });

        test("Does not find an evaluation for an unrecognised slug", () => {
            const context = new OctopusFeatureContext([resolved("my-feature", true, "reason")], silentLogger());

            expect(context.findToggleBySlug("another-feature")).toBeUndefined();
        });

        test("An evaluation without a slug is never matched", () => {
            const evaluation = new ServerSideEvaluation(undefined as unknown as string, true, "reason");
            const context = new OctopusFeatureContext([evaluation], silentLogger());

            expect(context.findToggleBySlug("undefined")).toBeUndefined();
        });
    });

    describe("evaluate", () => {
        test("Delegates a server-resolved evaluation, passing its value and reason through unchanged", () => {
            const context = new OctopusFeatureContext([resolved("my-feature", true, "The flag is enabled for this environment.")], silentLogger());

            expect(context.evaluate("my-feature", {})).toEqual({ value: true, reason: "The flag is enabled for this environment." });
        });

        test("Delegates a deferred evaluation to its rules", () => {
            const evaluation = new ServerSideEvaluation("my-feature", undefined, undefined, Contexts.EvaluationKey, [
                new ClientSideRule("Beta ring", [new ContextAttributeIsOneOfCondition("ring", ["beta"])]),
            ]);
            const context = new OctopusFeatureContext([evaluation], silentLogger());

            const result = context.evaluate("my-feature", Contexts.openFeature(undefined, { ring: "beta" }));

            expect(result).toEqual({ value: true, reason: "Matched rule 'Beta ring'." });
        });

        test("Looks the slug up case-insensitively", () => {
            const context = new OctopusFeatureContext([resolved("my-feature", true, "The flag is enabled for this environment.")], silentLogger());

            expect(context.evaluate("MY-FEATURE", {})).toEqual({ value: true, reason: "The flag is enabled for this environment." });
        });

        test("Throws FlagNotFoundError for an unrecognised slug", () => {
            const context = new OctopusFeatureContext([], silentLogger());

            expect(() => context.evaluate("missing-feature", {})).toThrow(
                new FlagNotFoundError("The slug provided did not match any of your Octopus Feature Flags. Please double check your slug and try again.")
            );
        });

        test("Propagates a ParseError from an unreadable evaluation", () => {
            const evaluation = new ServerSideEvaluation("my-feature", true); // value with no reason
            const context = new OctopusFeatureContext([evaluation], silentLogger());

            expect(() => context.evaluate("my-feature", {})).toThrow(ParseError);
        });

        test("Warns only once for a repeated unrecognised slug", () => {
            const logger = silentLogger();
            const context = new OctopusFeatureContext([], logger);

            expect(() => context.evaluate("missing-feature", {})).toThrow(FlagNotFoundError);
            expect(() => context.evaluate("missing-feature", {})).toThrow(FlagNotFoundError);
            expect(() => context.evaluate("Missing-Feature", {})).toThrow(FlagNotFoundError);

            expect(logger.warn).toHaveBeenCalledTimes(1);
        });

        test("Warns again for a different unrecognised slug", () => {
            const logger = silentLogger();
            const context = new OctopusFeatureContext([], logger);

            expect(() => context.evaluate("missing-feature-a", {})).toThrow(FlagNotFoundError);
            expect(() => context.evaluate("missing-feature-b", {})).toThrow(FlagNotFoundError);

            expect(logger.warn).toHaveBeenCalledTimes(2);
        });
    });
});
