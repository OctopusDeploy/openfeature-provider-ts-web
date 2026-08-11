import { ClientSideRule } from "./clientSideRule";
import { ContextAttributeIsOneOfCondition } from "./conditions/contextAttributeIsOneOfCondition";
import { PercentageByContextCondition } from "./conditions/percentageByContextCondition";
import { UnknownCondition } from "./conditions/unknownCondition";
import { parseServerSideEvaluation, parseServerSideEvaluations } from "./parseServerSideEvaluation";
import { ServerSideEvaluation } from "./serverSideEvaluation";

// Deserialisation of a v4 evaluation response: both flag shapes and the array the endpoint returns.
// Individual conditions are covered by conditions/parseCondition.test.ts.
describe("ServerSideEvaluation", () => {
    test("A server-resolved flag deserialises slug, value and reason", () => {
        const json = `
            {
                "slug": "my-feature",
                "value": true,
                "reason": "The flag is enabled for this environment."
            }
        `;

        const flag = parseServerSideEvaluation(JSON.parse(json));

        expect(flag).toStrictEqual(new ServerSideEvaluation("my-feature", true, "The flag is enabled for this environment.", undefined, undefined));
    });

    test("A deferred flag deserialises rules with polymorphic conditions", () => {
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

        const flag = parseServerSideEvaluation(JSON.parse(json));

        expect(flag).toStrictEqual(
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

        const flag = parseServerSideEvaluation(JSON.parse(json));

        const conditions = flag!.rules![0].conditions;
        expect(conditions[0]).toStrictEqual(new PercentageByContextCondition(50));
        expect(conditions[1]).toStrictEqual(new UnknownCondition("some-future-condition"));
    });

    test("An evaluations response deserialises as an array of flags", () => {
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

        const flags = parseServerSideEvaluations(JSON.parse(json));

        expect(flags).toHaveLength(2);

        expect(flags[0].slug).toBe("resolved-feature");
        expect(flags[0].value).toBe(false);
        expect(flags[0].rules).toBeUndefined();

        expect(flags[1].slug).toBe("deferred-feature");
        expect(flags[1].value).toBeUndefined();
        expect(flags[1].rules).toHaveLength(1);
        expect(flags[1].rules![0].conditions[0]).toStrictEqual(new PercentageByContextCondition(10));
    });

    test("A flag without a slug deserialises rather than failing the response", () => {
        const flag = parseServerSideEvaluation(JSON.parse(`{ "value": true, "reason": "The flag is enabled for this environment." }`));

        expect(flag?.slug).toBeUndefined();
        expect(flag?.value).toBe(true);
    });

    test("Every flag deserialises when one of them is missing its slug", () => {
        const json = `
            [
                { "value": true, "reason": "The flag is enabled for this environment." },
                { "slug": "well-formed-feature", "value": true, "reason": "The flag is enabled for this environment." }
            ]
        `;

        const flags = parseServerSideEvaluations(JSON.parse(json));

        expect(flags).toHaveLength(2);
        expect(flags[0].slug).toBeUndefined();
        expect(flags[1].slug).toBe("well-formed-feature");
    });

    test("A flag in both shapes at once is preserved, which evaluation reports rather than parsing", () => {
        const json = `
            {
                "slug": "my-feature",
                "value": true,
                "reason": "The flag is enabled for this environment.",
                "evaluationKey": "0f8fad5b-d9cb-469f-a165-70867728950e",
                "rules": [{ "name": "Beta ring", "conditions": [{ "type": "context-attribute-is-one-of", "key": "ring", "values": ["beta"] }] }]
            }
        `;

        const flag = parseServerSideEvaluation(JSON.parse(json));

        expect(flag?.value).toBe(true);
        expect(flag?.rules).toHaveLength(1);
    });

    test("A flag in neither shape is preserved, which evaluation reports rather than parsing", () => {
        const flag = parseServerSideEvaluation(JSON.parse(`{ "slug": "my-feature" }`));

        expect(flag).toStrictEqual(new ServerSideEvaluation("my-feature", undefined, undefined, undefined, undefined));
    });

    test("A rule that is not an object reads as a missing rule", () => {
        const json = `
            {
                "slug": "my-feature",
                "evaluationKey": "0f8fad5b-d9cb-469f-a165-70867728950e",
                "rules": [null, { "name": "Rule 1", "conditions": [{ "type": "percentage-by-context", "percentage": 50 }] }]
            }
        `;

        const flag = parseServerSideEvaluation(JSON.parse(json));

        expect(flag?.rules?.[0]).toBeUndefined();
        expect(flag?.rules?.[1]).toStrictEqual(new ClientSideRule("Rule 1", [new PercentageByContextCondition(50)]));
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

        const flag = parseServerSideEvaluation(JSON.parse(json));

        expect(flag).toStrictEqual(
            new ServerSideEvaluation("feature-with-extra-fields", undefined, undefined, "evaluation-key", [
                new ClientSideRule("Client-side targeting", [new ContextAttributeIsOneOfCondition("license-type", ["free"])]),
            ])
        );
    });

    test("A flag that is not an object is dropped from the response", () => {
        const json = `[null, "my-feature", { "slug": "well-formed-feature", "value": true, "reason": "The flag is enabled for this environment." }]`;

        const flags = parseServerSideEvaluations(JSON.parse(json));

        expect(flags).toHaveLength(1);
        expect(flags[0].slug).toBe("well-formed-feature");
    });

    test("A response that is not an array holds no flags", () => {
        expect(parseServerSideEvaluations(JSON.parse(`{ "slug": "my-feature" }`))).toEqual([]);
        expect(parseServerSideEvaluations(JSON.parse(`null`))).toEqual([]);
        expect(parseServerSideEvaluations(undefined)).toEqual([]);
    });
});
