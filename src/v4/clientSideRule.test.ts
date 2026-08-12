import { ParseError } from "@openfeature/web-sdk";
import * as Contexts from "../testing/contexts";
import { ClientSideRule } from "./clientSideRule";
import { ContextAttributeIsOneOfCondition } from "./conditions/contextAttributeIsOneOfCondition";
import { PercentageByContextCondition } from "./conditions/percentageByContextCondition";
import { UnknownCondition } from "./conditions/unknownCondition";
import { parseClientSideRule } from "./parseClientSideRule";

describe("ClientSideRule", () => {
    describe("deserialisation", () => {
        test("Deserialises its name and its conditions", () => {
            const json = `
                {
                    "name": "Rule 1",
                    "conditions": [
                        { "type": "percentage-by-context", "percentage": 50 },
                        { "type": "context-attribute-is-one-of", "key": "user-id", "values": ["1234", "5678"] }
                    ]
                }
            `;

            const rule = parseClientSideRule(JSON.parse(json));

            expect(rule).toStrictEqual(
                new ClientSideRule("Rule 1", [new PercentageByContextCondition(50), new ContextAttributeIsOneOfCondition("user-id", ["1234", "5678"])])
            );
        });

        test("Reads an absent name as undefined", () => {
            const rule = parseClientSideRule(JSON.parse(`{ "conditions": [{ "type": "percentage-by-context", "percentage": 50 }] }`));

            expect(rule?.name).toBeUndefined();
            expect(rule?.conditions).toHaveLength(1);
        });

        test("Reads absent conditions as undefined", () => {
            const rule = parseClientSideRule(JSON.parse(`{ "name": "Rule 1" }`));

            expect(rule?.name).toBe("Rule 1");
            expect(rule?.conditions).toBeUndefined();
        });

        test("Reads conditions that are not an array as undefined", () => {
            const rule = parseClientSideRule(JSON.parse(`{ "name": "Rule 1", "conditions": { "type": "percentage-by-context" } }`));

            expect(rule?.conditions).toBeUndefined();
        });

        test("Reads a condition that is not an object as a missing condition", () => {
            const rule = parseClientSideRule(JSON.parse(`{ "name": "Rule 1", "conditions": [null, { "type": "percentage-by-context", "percentage": 50 }] }`));

            expect(rule?.conditions).toEqual([undefined, new PercentageByContextCondition(50)]);
        });

        test("Preserves empty conditions, which evaluation reports rather than parsing", () => {
            const rule = parseClientSideRule(JSON.parse(`{ "name": "Rule 1", "conditions": [] }`));

            expect(rule).toStrictEqual(new ClientSideRule("Rule 1", []));
        });

        test("Ignores properties it does not model", () => {
            const json = `
                {
                    "name": "Client-side targeting",
                    "conditions": [{ "type": "context-attribute-is-one-of", "key": "license-type", "values": ["free"] }],
                    "cats": "dogs"
                }
            `;

            const rule = parseClientSideRule(JSON.parse(json));

            expect(rule).toStrictEqual(new ClientSideRule("Client-side targeting", [new ContextAttributeIsOneOfCondition("license-type", ["free"])]));
        });

        test("A rule that is not an object reads as a missing rule", () => {
            expect(parseClientSideRule(JSON.parse(`null`))).toBeUndefined();
            expect(parseClientSideRule(JSON.parse(`"Rule 1"`))).toBeUndefined();
            expect(parseClientSideRule(JSON.parse(`[]`))).toBeUndefined();
        });
    });

    describe("matches", () => {
        test("A single matching condition matches", () => {
            const rule = new ClientSideRule("Rule 1", [new ContextAttributeIsOneOfCondition("plan", ["pro"])]);

            expect(rule.matches(Contexts.forRules(undefined, { plan: "pro" }))).toBe(true);
        });

        test("Conditions are combined with and", () => {
            const rule = new ClientSideRule("Rule 1", [new PercentageByContextCondition(100), new ContextAttributeIsOneOfCondition("plan", ["pro"])]);

            expect(rule.matches(Contexts.forRules(Contexts.TargetingKey, { plan: "pro" }))).toBe(true);
            expect(rule.matches(Contexts.forRules(Contexts.TargetingKey, { plan: "free" }))).toBe(false);
        });

        test("A malformed condition behind a failing one is never read", () => {
            // Conditions stop at the first that does not match, so the rest are never read.
            const rule = new ClientSideRule("Rule 1", [new ContextAttributeIsOneOfCondition("plan", ["pro"]), new PercentageByContextCondition(undefined)]);

            expect(rule.matches(Contexts.forRules(Contexts.TargetingKey, { plan: "free" }))).toBe(false);
        });

        test("A condition from a newer server is well-formed, it just never matches", () => {
            const rule = new ClientSideRule("Rule 1", [new UnknownCondition("some-future-condition")]);

            expect(rule.matches(Contexts.forRules(Contexts.TargetingKey))).toBe(false);
        });

        // Deserialised rather than constructed: name and conditions are declared non-optional, so these
        // shapes only arrive off the wire.
        test.each([
            [`{ "conditions": [{ "type": "percentage-by-context", "percentage": 50 }] }`, "A rule has no name."],
            [`{ "name": "R", "conditions": [] }`, "Rule 'R' has no conditions."],
            [`{ "name": "R" }`, "Rule 'R' has no conditions."],
            [`{ "name": "R", "conditions": null }`, "Rule 'R' has no conditions."],
            [`{ "name": "R", "conditions": [null] }`, "Rule 'R' has a missing condition."],
        ])("A malformed rule throws a parse error describing the problem: %s", (json, expectedProblem) => {
            const rule = parseClientSideRule(JSON.parse(json))!;

            expect(() => rule.matches(Contexts.forRules(Contexts.TargetingKey))).toThrow(new ParseError(expectedProblem));
        });
    });
});
