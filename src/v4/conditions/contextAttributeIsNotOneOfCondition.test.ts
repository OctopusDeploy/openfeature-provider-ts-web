import { ParseError } from "@openfeature/web-sdk";
import * as Contexts from "../../testing/contexts";
import { ContextAttributeIsNotOneOfCondition } from "./contextAttributeIsNotOneOfCondition";
import { parseCondition } from "./parseCondition";

describe("ContextAttributeIsNotOneOfCondition", () => {
    test("Deserialises to its concrete type", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "context-attribute-is-not-one-of", "key": "region", "values": ["us", "eu"] }`));

        expect(condition).toStrictEqual(new ContextAttributeIsNotOneOfCondition("region", ["us", "eu"]));
    });

    test("Reads an absent key as undefined", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "context-attribute-is-not-one-of", "values": ["us"] }`)) as ContextAttributeIsNotOneOfCondition;

        expect(condition).toBeInstanceOf(ContextAttributeIsNotOneOfCondition);
        expect(condition.key).toBeUndefined();
    });

    test("Reads absent values as undefined", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "context-attribute-is-not-one-of", "key": "region" }`)) as ContextAttributeIsNotOneOfCondition;

        expect(condition).toBeInstanceOf(ContextAttributeIsNotOneOfCondition);
        expect(condition.values).toBeUndefined();
    });

    test("Ignores properties it does not model, including the discriminator", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "context-attribute-is-not-one-of", "key": "region", "values": ["au"], "cats": "dogs" }`));

        expect(condition).toStrictEqual(new ContextAttributeIsNotOneOfCondition("region", ["au"]));
    });

    describe("matches", () => {
        const condition = new ContextAttributeIsNotOneOfCondition("region", ["eu"]);

        test("Matches unless the attribute value is listed", () => {
            expect(condition.matches(Contexts.forRules(undefined, { region: "us" }))).toBe(true);
            expect(condition.matches(Contexts.forRules(undefined, { region: "eu" }))).toBe(false);
        });

        test("Matches a missing attribute, which is not one of the values", () => {
            expect(condition.matches(Contexts.forRules())).toBe(true);
        });

        test("Compares the key and value case-insensitively", () => {
            const condition = new ContextAttributeIsNotOneOfCondition("Region", ["EU"]);

            expect(condition.matches(Contexts.forRules(undefined, { region: "eu" }))).toBe(false);
        });

        test("Treats a non-string value as absent, so the condition matches", () => {
            const condition = new ContextAttributeIsNotOneOfCondition("user-id", ["1234"]);

            expect(condition.matches(Contexts.forRules(undefined, { "user-id": 1234 }))).toBe(true);
        });

        test("Matches when the caller supplied no context", () => {
            expect(condition.matches(Contexts.withoutOpenFeatureContext())).toBe(true);
        });

        // Deserialised rather than constructed: key and values are declared non-optional, so these
        // shapes only arrive off the wire.
        test.each([
            [`{ "type": "context-attribute-is-not-one-of", "values": ["eu"] }`, "A condition is missing a key."],
            [`{ "type": "context-attribute-is-not-one-of", "key": "region" }`, "A condition is missing values."],
            [`{ "type": "context-attribute-is-not-one-of", "key": "region", "values": [] }`, "A condition is missing values."],
            [`{ "type": "context-attribute-is-not-one-of", "key": "region", "values": ["eu", null] }`, "A condition is missing a value."],
        ])("A condition with nothing to match on throws a parse error: %s", (json, expectedProblem) => {
            const condition = parseCondition(JSON.parse(json))!;

            expect(() => condition.matches(Contexts.forRules(undefined, { region: "us" }))).toThrow(new ParseError(expectedProblem));
        });
    });
});
