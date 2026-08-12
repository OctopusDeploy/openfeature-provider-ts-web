import { ParseError } from "@openfeature/web-sdk";
import * as Contexts from "../../testing/contexts";
import { ContextAttributeIsOneOfCondition } from "./contextAttributeIsOneOfCondition";
import { parseCondition } from "./parseCondition";

describe("ContextAttributeIsOneOfCondition", () => {
    describe("deserialisation", () => {
        test("Deserialises to its concrete type", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "context-attribute-is-one-of", "key": "user-id", "values": ["1234", "5678"] }`));

            expect(condition).toStrictEqual(new ContextAttributeIsOneOfCondition("user-id", ["1234", "5678"]));
        });

        test("Reads an absent key as undefined", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "context-attribute-is-one-of", "values": ["1234"] }`)) as ContextAttributeIsOneOfCondition;

            expect(condition).toBeInstanceOf(ContextAttributeIsOneOfCondition);
            expect(condition.key).toBeUndefined();
            expect(condition.values).toEqual(["1234"]);
        });

        test("Reads absent values as undefined", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "context-attribute-is-one-of", "key": "user-id" }`)) as ContextAttributeIsOneOfCondition;

            expect(condition).toBeInstanceOf(ContextAttributeIsOneOfCondition);
            expect(condition.key).toBe("user-id");
            expect(condition.values).toBeUndefined();
        });

        test("Reads values that are not an array as undefined", () => {
            const condition = parseCondition(
                JSON.parse(`{ "type": "context-attribute-is-one-of", "key": "user-id", "values": "1234" }`)
            ) as ContextAttributeIsOneOfCondition;

            expect(condition.values).toBeUndefined();
        });

        test("Reads a value that is not a string as undefined, leaving the rest of the array intact", () => {
            const condition = parseCondition(
                JSON.parse(`{ "type": "context-attribute-is-one-of", "key": "user-id", "values": ["1234", 5678] }`)
            ) as ContextAttributeIsOneOfCondition;

            expect(condition.values).toEqual(["1234", undefined]);
        });

        test("Preserves empty values", () => {
            const condition = parseCondition(JSON.parse(`{ "type": "context-attribute-is-one-of", "key": "user-id", "values": [] }`));

            expect(condition).toStrictEqual(new ContextAttributeIsOneOfCondition("user-id", []));
        });

        test("Ignores properties it does not model, including the discriminator", () => {
            const condition = parseCondition(
                JSON.parse(`{ "type": "context-attribute-is-one-of", "key": "license-type", "values": ["free"], "more": "data" }`)
            );

            expect(condition).toStrictEqual(new ContextAttributeIsOneOfCondition("license-type", ["free"]));
        });
    });

    describe("matches", () => {
        const condition = new ContextAttributeIsOneOfCondition("user-id", ["1234", "5678"]);

        test("Matches when the attribute value is listed", () => {
            expect(condition.matches(Contexts.forRules(undefined, { "user-id": "5678" }))).toBe(true);
        });

        test("Does not match when the attribute value is not listed", () => {
            expect(condition.matches(Contexts.forRules(undefined, { "user-id": "9999" }))).toBe(false);
        });

        test("Does not match a missing attribute, which is not one of the values", () => {
            expect(condition.matches(Contexts.forRules())).toBe(false);
        });

        test("Compares the key and value case-insensitively", () => {
            const condition = new ContextAttributeIsOneOfCondition("Region", ["EU", "US"]);

            expect(condition.matches(Contexts.forRules(undefined, { region: "eu" }))).toBe(true);
            expect(condition.matches(Contexts.forRules(undefined, { REGION: "Us" }))).toBe(true);
        });

        test.each([
            ["Plan", "free", "plan", "pro"],
            ["plan", "pro", "Plan", "free"],
        ])("Checks every entry whose key matches, not just the first: %s=%s, %s=%s", (firstKey, firstValue, secondKey, secondValue) => {
            // A context can hold several case variants of one key, and only one of them need match.
            const condition = new ContextAttributeIsOneOfCondition("plan", ["pro"]);

            expect(condition.matches(Contexts.forRules(undefined, { [firstKey]: firstValue, [secondKey]: secondValue }))).toBe(true);
        });

        test("Treats a non-string value as absent, as v3 segment matching does", () => {
            expect(condition.matches(Contexts.forRules(undefined, { "user-id": 1234 }))).toBe(false);
        });

        test("Does not match when the caller supplied no context", () => {
            expect(condition.matches(Contexts.withoutOpenFeatureContext())).toBe(false);
        });

        // Deserialised rather than constructed: key and values are declared non-optional, so these
        // shapes only arrive off the wire. A condition with nothing to match on has no defensible
        // answer, so it fails the evaluation.
        test.each([
            [`{ "type": "context-attribute-is-one-of", "values": ["pro"] }`, "A condition is missing a key."],
            [`{ "type": "context-attribute-is-one-of", "key": "plan" }`, "A condition is missing values."],
            [`{ "type": "context-attribute-is-one-of", "key": "plan", "values": [] }`, "A condition is missing values."],
            [`{ "type": "context-attribute-is-one-of", "key": "plan", "values": ["pro", null] }`, "A condition is missing a value."],
        ])("A condition with nothing to match on throws a parse error: %s", (json, expectedProblem) => {
            const condition = parseCondition(JSON.parse(json))!;

            expect(() => condition.matches(Contexts.forRules(undefined, { plan: "pro" }))).toThrow(new ParseError(expectedProblem));
        });
    });
});
