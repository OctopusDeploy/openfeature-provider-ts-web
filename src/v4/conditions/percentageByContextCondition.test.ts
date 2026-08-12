import { parseCondition } from "./parseCondition";
import { PercentageByContextCondition } from "./percentageByContextCondition";

describe("PercentageByContextCondition", () => {
    test("Deserialises to its concrete type", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": 50 }`));

        expect(condition).toStrictEqual(new PercentageByContextCondition(50));
    });

    test("Reads an absent percentage as undefined, keeping it distinguishable from an explicit 0", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context" }`));

        expect(condition).toStrictEqual(new PercentageByContextCondition(undefined));
    });

    test("Preserves an explicit percentage of 0", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": 0 }`));

        expect(condition).toStrictEqual(new PercentageByContextCondition(0));
    });

    test("Reads a percentage that is not a number as undefined", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": "fifty" }`));

        expect(condition).toStrictEqual(new PercentageByContextCondition(undefined));
    });

    test("Reads a fractional percentage as undefined, as the wire contract is an integer", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": 50.5 }`));

        expect(condition).toStrictEqual(new PercentageByContextCondition(undefined));
    });

    test("Preserves a percentage outside the range, which evaluation reports rather than parsing", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": 101 }`));

        expect(condition).toStrictEqual(new PercentageByContextCondition(101));
    });

    test("Ignores properties it does not model, including the discriminator", () => {
        const condition = parseCondition(JSON.parse(`{ "type": "percentage-by-context", "percentage": 50, "cats": "dogs" }`));

        expect(condition).toStrictEqual(new PercentageByContextCondition(50));
    });
});
