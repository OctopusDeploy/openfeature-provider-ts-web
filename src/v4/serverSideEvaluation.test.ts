import * as Contexts from "../testing/contexts";
import { ClientSideRule } from "./clientSideRule";
import { ContextAttributeIsOneOfCondition } from "./conditions/contextAttributeIsOneOfCondition";
import { PercentageByContextCondition } from "./conditions/percentageByContextCondition";
import { UnknownCondition } from "./conditions/unknownCondition";
import { parseServerSideEvaluation, parseServerSideEvaluations } from "./parseServerSideEvaluation";
import { ServerSideEvaluation } from "./serverSideEvaluation";

// Deserialisation of a v4 evaluation response: both evaluation shapes and the array the endpoint returns.
// Individual conditions are covered by conditions/parseCondition.test.ts.
describe("ServerSideEvaluation", () => {
    test("A server-resolved evaluation deserialises slug, value and reason", () => {
        const json = `
            {
                "slug": "my-feature",
                "value": true,
                "reason": "The flag is enabled for this environment."
            }
        `;

        const evaluation = parseServerSideEvaluation(JSON.parse(json));

        expect(evaluation).toStrictEqual(new ServerSideEvaluation("my-feature", true, "The flag is enabled for this environment.", undefined, undefined));
    });

    test("A deferred evaluation deserialises rules with polymorphic conditions", () => {
        const json = `
            {
                "slug": "my-feature",
                "evaluationKey": "0f8fad5b-d9cb-469f-a165-70867728950e",
                "rules": [
                    {
                        "name": "Rule 1",
                        "conditions": [
                            { "type": "percentage-by-context", "percentage": 50 },
                            { "type": "context-attribute-is-one-of", "key": "user-id", "values": ["1234", "5678"] }
                        ]
                    }
                ]
            }
        `;

        const evaluation = parseServerSideEvaluation(JSON.parse(json));

        expect(evaluation).toStrictEqual(
            new ServerSideEvaluation("my-feature", undefined, undefined, "0f8fad5b-d9cb-469f-a165-70867728950e", [
                new ClientSideRule("Rule 1", [new PercentageByContextCondition(50), new ContextAttributeIsOneOfCondition("user-id", ["1234", "5678"])]),
            ])
        );
    });

    test("An unknown condition alongside known conditions is preserved without failing the response", () => {
        const json = `
            {
                "slug": "my-feature",
                "evaluationKey": "0f8fad5b-d9cb-469f-a165-70867728950e",
                "rules": [
                    {
                        "name": "Rule 1",
                        "conditions": [
                            { "type": "percentage-by-context", "percentage": 50 },
                            { "type": "some-future-condition", "someField": "someValue" }
                        ]
                    }
                ]
            }
        `;

        const evaluation = parseServerSideEvaluation(JSON.parse(json));

        const conditions = evaluation!.rules![0].conditions;
        expect(conditions[0]).toStrictEqual(new PercentageByContextCondition(50));
        expect(conditions[1]).toStrictEqual(new UnknownCondition("some-future-condition"));
    });

    test("An evaluation response deserialises as an array of evaluations", () => {
        const json = `
            [
                { "slug": "resolved-feature", "value": false, "reason": "The flag is disabled for this environment." },
                {
                    "slug": "deferred-feature",
                    "evaluationKey": "0f8fad5b-d9cb-469f-a165-70867728950e",
                    "rules": [
                        { "name": "Rule 1", "conditions": [ { "type": "percentage-by-context", "percentage": 10 } ] }
                    ]
                }
            ]
        `;

        const evaluations = parseServerSideEvaluations(JSON.parse(json));

        expect(evaluations).toHaveLength(2);

        expect(evaluations[0].slug).toBe("resolved-feature");
        expect(evaluations[0].value).toBe(false);
        expect(evaluations[0].rules).toBeUndefined();

        expect(evaluations[1].slug).toBe("deferred-feature");
        expect(evaluations[1].value).toBeUndefined();
        expect(evaluations[1].rules).toHaveLength(1);
        expect(evaluations[1].rules![0].conditions[0]).toStrictEqual(new PercentageByContextCondition(10));
    });

    test("An evaluation without a slug deserialises rather than failing the response", () => {
        const evaluation = parseServerSideEvaluation(JSON.parse(`{ "value": true, "reason": "The flag is enabled for this environment." }`));

        expect(evaluation?.slug).toBeUndefined();
        expect(evaluation?.value).toBe(true);
    });

    test("Every evaluation deserialises when one of them is missing its slug", () => {
        const json = `
            [
                { "value": true, "reason": "The flag is enabled for this environment." },
                { "slug": "well-formed-feature", "value": true, "reason": "The flag is enabled for this environment." }
            ]
        `;

        const evaluations = parseServerSideEvaluations(JSON.parse(json));

        expect(evaluations).toHaveLength(2);
        expect(evaluations[0].slug).toBeUndefined();
        expect(evaluations[1].slug).toBe("well-formed-feature");
    });

    test("An evaluation in both shapes at once is preserved, which evaluation reports rather than parsing", () => {
        const json = `
            {
                "slug": "my-feature",
                "value": true,
                "reason": "The flag is enabled for this environment.",
                "evaluationKey": "0f8fad5b-d9cb-469f-a165-70867728950e",
                "rules": [{ "name": "Beta ring", "conditions": [{ "type": "context-attribute-is-one-of", "key": "ring", "values": ["beta"] }] }]
            }
        `;

        const evaluation = parseServerSideEvaluation(JSON.parse(json));

        expect(evaluation?.value).toBe(true);
        expect(evaluation?.rules).toHaveLength(1);
    });

    test("An evaluation in neither shape is preserved, which evaluation reports rather than parsing", () => {
        const evaluation = parseServerSideEvaluation(JSON.parse(`{ "slug": "my-feature" }`));

        expect(evaluation).toStrictEqual(new ServerSideEvaluation("my-feature", undefined, undefined, undefined, undefined));
    });

    test("A rule that is not an object reads as a missing rule", () => {
        const json = `
            {
                "slug": "my-feature",
                "evaluationKey": "0f8fad5b-d9cb-469f-a165-70867728950e",
                "rules": [null, { "name": "Rule 1", "conditions": [{ "type": "percentage-by-context", "percentage": 50 }] }]
            }
        `;

        const evaluation = parseServerSideEvaluation(JSON.parse(json));

        expect(evaluation?.rules?.[0]).toBeUndefined();
        expect(evaluation?.rules?.[1]).toStrictEqual(new ClientSideRule("Rule 1", [new PercentageByContextCondition(50)]));
    });

    test("Ignores properties it does not model, at every level", () => {
        const json = `
            {
                "slug": "feature-with-extra-fields",
                "evaluationKey": "evaluation-key",
                "rules": [
                    {
                        "name": "Client-side targeting",
                        "conditions": [{ "type": "context-attribute-is-one-of", "key": "license-type", "values": ["free"], "more": "data" }],
                        "cats": "dogs"
                    }
                ],
                "pianos": { "nested": "value" }
            }
        `;

        const evaluation = parseServerSideEvaluation(JSON.parse(json));

        expect(evaluation).toStrictEqual(
            new ServerSideEvaluation("feature-with-extra-fields", undefined, undefined, "evaluation-key", [
                new ClientSideRule("Client-side targeting", [new ContextAttributeIsOneOfCondition("license-type", ["free"])]),
            ])
        );
    });

    test("An evaluation that is not an object is dropped from the response", () => {
        const json = `[null, "my-feature", { "slug": "well-formed-feature", "value": true, "reason": "The flag is enabled for this environment." }]`;

        const evaluations = parseServerSideEvaluations(JSON.parse(json));

        expect(evaluations).toHaveLength(1);
        expect(evaluations[0].slug).toBe("well-formed-feature");
    });

    test("A response that is not an array holds no evaluations", () => {
        expect(parseServerSideEvaluations(JSON.parse(`{ "slug": "my-feature" }`))).toEqual([]);
        expect(parseServerSideEvaluations(JSON.parse(`null`))).toEqual([]);
        expect(parseServerSideEvaluations(undefined)).toEqual([]);
    });

    describe("evaluate", () => {
        test("A server-resolved flag surfaces its value and reason unchanged", () => {
            const evaluation = new ServerSideEvaluation("my-feature", true, "The flag is enabled for this environment.");

            expect(evaluation.evaluate(Contexts.openFeature(Contexts.TargetingKey))).toEqual({
                value: true,
                reason: "The flag is enabled for this environment.",
            });
        });

        test("A deferred flag is enabled by the first rule that matches", () => {
            const evaluation = deferredTo(
                new ClientSideRule("Beta ring", [new ContextAttributeIsOneOfCondition("ring", ["beta"])]),
                new ClientSideRule("Trial licences", [new ContextAttributeIsOneOfCondition("license", ["trial"])])
            );

            expect(evaluation.evaluate(Contexts.openFeature(Contexts.TargetingKey, { license: "trial" }))).toEqual({
                value: true,
                reason: "Matched rule 'Trial licences'.",
            });
        });

        test("A deferred flag whose rules all fail is disabled", () => {
            const evaluation = deferredTo(new ClientSideRule("Beta ring", [new ContextAttributeIsOneOfCondition("ring", ["beta"])]));

            expect(evaluation.evaluate(Contexts.openFeature(Contexts.TargetingKey, { ring: "stable" }))).toEqual({
                value: false,
                reason: "Did not match any rules.",
            });
        });

        test("Rules are combined with or, so a later rule can still enable the flag", () => {
            const evaluation = deferredTo(
                new ClientSideRule("Nobody", [new PercentageByContextCondition(0)]),
                new ClientSideRule("Everybody", [new PercentageByContextCondition(100)])
            );

            expect(evaluation.evaluate(Contexts.openFeature(Contexts.TargetingKey))).toEqual({
                value: true,
                reason: "Matched rule 'Everybody'.",
            });
        });

        test("A deferred flag evaluates without a context, which no rule requiring one can match", () => {
            const evaluation = deferredTo(new ClientSideRule("Beta ring", [new ContextAttributeIsOneOfCondition("ring", ["beta"])]));

            expect(evaluation.evaluate(undefined)).toEqual({ value: false, reason: "Did not match any rules." });
        });
    });
});

function deferredTo(...rules: ClientSideRule[]): ServerSideEvaluation {
    return new ServerSideEvaluation("my-feature", undefined, undefined, Contexts.EvaluationKey, rules);
}
