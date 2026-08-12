import { ContextAttributeIsNotOneOfCondition } from "./contextAttributeIsNotOneOfCondition";
import { ContextAttributeIsOneOfCondition } from "./contextAttributeIsOneOfCondition";
import { parseCondition } from "./parseCondition";
import { PercentageByContextCondition } from "./percentageByContextCondition";
import { UnknownCondition } from "./unknownCondition";

// Polymorphic deserialisation of a single condition. The concrete types are covered by their own
// tests; whole responses are covered by serverSideEvaluation.test.ts.
describe("parseCondition", () => {
    test("A mixed condition array deserialises each to its concrete type", () => {
        const json = `
            [
                { "type": "percentage-by-context", "percentage": 25 },
                { "type": "context-attribute-is-one-of", "key": "user-id", "values": ["1234"] },
                { "type": "context-attribute-is-not-one-of", "key": "region", "values": ["au"] }
            ]
        `;

        const conditions = (JSON.parse(json) as unknown[]).map(parseCondition);

        expect(conditions).toHaveLength(3);
        expect(conditions[0]).toBeInstanceOf(PercentageByContextCondition);
        expect(conditions[1]).toBeInstanceOf(ContextAttributeIsOneOfCondition);
        expect(conditions[2]).toBeInstanceOf(ContextAttributeIsNotOneOfCondition);
    });

    test("An unrecognised type alongside known conditions is preserved without failing the others", () => {
        const json = `
            [
                { "type": "percentage-by-context", "percentage": 50 },
                { "type": "some-future-condition", "someField": "someValue" }
            ]
        `;

        const conditions = (JSON.parse(json) as unknown[]).map(parseCondition);

        expect(conditions[0]).toStrictEqual(new PercentageByContextCondition(50));
        expect(conditions[1]).toStrictEqual(new UnknownCondition("some-future-condition"));
    });

    test("A condition that is not an object reads as a missing condition", () => {
        expect(parseCondition(JSON.parse(`null`))).toBeUndefined();
        expect(parseCondition(JSON.parse(`"context-attribute-is-one-of"`))).toBeUndefined();
        expect(parseCondition(JSON.parse(`[]`))).toBeUndefined();
        expect(parseCondition(undefined)).toBeUndefined();
    });
});
