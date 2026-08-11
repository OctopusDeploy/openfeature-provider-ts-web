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
});
