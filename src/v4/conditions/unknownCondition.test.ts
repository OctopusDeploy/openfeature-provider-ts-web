import { parseCondition } from "./parseCondition";
import { UnknownCondition } from "./unknownCondition";

describe("UnknownCondition", () => {
    test("An unknown condition type deserialises to UnknownCondition instead of throwing", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "not-a-real-condition", "percentage": 50 }`));

        expect(condition).toStrictEqual(new UnknownCondition("not-a-real-condition"));
    });

    test("A condition without a type discriminator deserialises to UnknownCondition", () => {
        const condition = parseCondition(JSON.parse(`{ "percentage": 50 }`));

        expect(condition).toStrictEqual(new UnknownCondition(undefined));
    });

    test("A discriminator that is not a string deserialises to UnknownCondition without a type", () => {
        const condition = parseCondition(JSON.parse(`{ "type": 123, "percentage": 50 }`));

        expect(condition).toStrictEqual(new UnknownCondition(undefined));
    });

    test("Retains the discriminator but not the rest of the payload", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "not-a-real-condition", "key": "license", "values": ["trial"] }`)) as UnknownCondition;

        expect(condition.type).toBe("not-a-real-condition");
        expect(Object.keys(condition)).toEqual(["type"]);
    });
});
