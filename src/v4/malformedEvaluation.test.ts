import { ParseError } from "@openfeature/web-sdk";
import * as Contexts from "../testing/contexts";
import { parseServerSideEvaluation } from "./parseServerSideEvaluation";

// A response the server could not legitimately have sent throws ParseError when the flag is
// evaluated. The one exception — a condition type this client does not recognise — is covered by
// unrecognisedCondition.test.ts.
//
// Every case is parsed rather than constructed: the declared types are non-optional, so these shapes
// are only reachable off the wire.
describe("A malformed evaluation", () => {
    // Satisfies every rule below, so a flag that failed to throw would visibly turn on.
    function matchingContext() {
        return Contexts.openFeature(Contexts.TargetingKey, { license: "trial", ring: "beta" });
    }

    function flag(json: string) {
        return parseServerSideEvaluation(JSON.parse(json))!;
    }

    test.each([
        // Neither shape, or both at once.
        [`{ "slug": "my-feature" }`, "The flag has neither a value nor rules."],
        [`{ "slug": "my-feature", "value": true }`, "The flag has a value but has no reason."],
        [
            `{ "slug": "my-feature", "value": true, "reason": "Enabled.", "evaluationKey": "evaluation-key", "rules": [{ "name": "Beta ring", "conditions": [{ "type": "context-attribute-is-one-of", "key": "ring", "values": ["beta"] }] }] }`,
            "The flag has both a server-resolved value and client-side rules.",
        ],
        // Deferred, but not evaluable.
        [
            `{ "slug": "my-feature", "rules": [{ "name": "Beta ring", "conditions": [{ "type": "context-attribute-is-one-of", "key": "ring", "values": ["beta"] }] }] }`,
            "The flag defers to the client but has no evaluation key.",
        ],
        [`{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [] }`, "The flag defers to the client with no rules."],
        [`{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [null] }`, "The flag has a missing rule."],
        // Rules.
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "conditions": [{ "type": "context-attribute-is-one-of", "key": "ring", "values": ["beta"] }] }] }`,
            "A rule has no name.",
        ],
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Beta ring", "conditions": [] }] }`,
            "Rule 'Beta ring' has no conditions.",
        ],
        [`{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Beta ring" }] }`, "Rule 'Beta ring' has no conditions."],
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Beta ring", "conditions": null }] }`,
            "Rule 'Beta ring' has no conditions.",
        ],
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Beta ring", "conditions": [null] }] }`,
            "Rule 'Beta ring' has a missing condition.",
        ],
        // Conditions with no usable type. Unlike an unrecognised type, no server version emits these.
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Trial licences", "conditions": [{ "key": "license", "values": ["trial"] }] }] }`,
            "A condition is missing a type.",
        ],
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Trial licences", "conditions": [{ "type": 123, "key": "license", "values": ["trial"] }] }] }`,
            "A condition is missing a type.",
        ],
        // percentage-by-context.
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Partial rollout", "conditions": [{ "type": "percentage-by-context" }] }] }`,
            "A condition is missing a percentage value.",
        ],
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Partial rollout", "conditions": [{ "type": "percentage-by-context", "percentage": 101 }] }] }`,
            "A condition has a percentage of 101.",
        ],
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Partial rollout", "conditions": [{ "type": "percentage-by-context", "percentage": -1 }] }] }`,
            "A condition has a percentage of -1.",
        ],
        // Attribute conditions.
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Trial licences", "conditions": [{ "type": "context-attribute-is-one-of", "key": "license" }] }] }`,
            "A condition is missing values.",
        ],
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Trial licences", "conditions": [{ "type": "context-attribute-is-one-of", "key": "license", "values": [] }] }] }`,
            "A condition is missing values.",
        ],
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Trial licences", "conditions": [{ "type": "context-attribute-is-one-of", "key": "license", "values": [null] }] }] }`,
            "A condition is missing a value.",
        ],
        [
            `{ "slug": "my-feature", "evaluationKey": "evaluation-key", "rules": [{ "name": "Trial licences", "conditions": [{ "type": "context-attribute-is-one-of", "values": ["trial"] }] }] }`,
            "A condition is missing a key.",
        ],
    ])("throws a parse error describing the problem: %s", (json, expectedProblem) => {
        const evaluate = () => flag(json).evaluate(matchingContext());

        // The class is what the OpenFeature SDK turns into the caller's default value, and matching an
        // error instance compares only the message, so both are asserted.
        expect(evaluate).toThrow(ParseError);
        expect(evaluate).toThrow(new ParseError(expectedProblem));
    });

    test("costs only its own flag, leaving the rest of the response usable", () => {
        const json = `
            [
                { "slug": "malformed-feature" },
                { "slug": "well-formed-feature", "value": true, "reason": "The flag is enabled for this environment." }
            ]
        `;

        const evaluations = JSON.parse(json).map((raw: unknown) => parseServerSideEvaluation(raw)!);

        expect(() => evaluations[0].evaluate(matchingContext())).toThrow(ParseError);
        expect(evaluations[1].evaluate(matchingContext())).toEqual({ value: true, reason: "The flag is enabled for this environment." });
    });
});
