import { ClientSideRule } from "./clientSideRule";
import { ContextAttributeIsOneOfCondition } from "./conditions/contextAttributeIsOneOfCondition";
import { PercentageByContextCondition } from "./conditions/percentageByContextCondition";
import { parseClientSideRule } from "./parseClientSideRule";

describe("ClientSideRule", () => {
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
