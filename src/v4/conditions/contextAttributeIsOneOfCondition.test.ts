import { ContextAttributeIsOneOfCondition } from "./contextAttributeIsOneOfCondition";
import { parseCondition } from "./parseCondition";

describe("ContextAttributeIsOneOfCondition", () => {
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
        const condition = parseCondition(JSON.parse(`{ "type": "context-attribute-is-one-of", "key": "license-type", "values": ["free"], "more": "data" }`));

        expect(condition).toStrictEqual(new ContextAttributeIsOneOfCondition("license-type", ["free"]));
    });
});
