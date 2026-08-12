import * as Contexts from "../testing/contexts";
import { parseServerSideEvaluation } from "./parseServerSideEvaluation";

// A condition naming a type this version does not recognise is a capability from a newer server, not
// a bad payload: it fails its own rule and nothing else. The deliberate departure from
// malformedEvaluation.test.ts, which covers every other shape — including a condition with no type at
// all.
describe("An unrecognised condition type", () => {
    function flag(json: string) {
        return parseServerSideEvaluation(JSON.parse(json))!;
    }

    test("fails its rule without an error", () => {
        const json = `
            {
                "slug": "my-feature",
                "evaluationKey": "evaluation-key",
                "rules": [
                    {
                        "name": "Something newer than this library",
                        "conditions": [{ "type": "not-a-real-condition", "key": "license", "values": ["trial"] }]
                    }
                ]
            }
        `;

        const result = flag(json).evaluate(Contexts.openFeature(Contexts.TargetingKey, { license: "trial" }));

        expect(result).toEqual({ value: false, reason: "Did not match any rules." });
    });

    test("leaves the other rules to decide", () => {
        const json = `
            {
                "slug": "my-feature",
                "evaluationKey": "evaluation-key",
                "rules": [
                    {
                        "name": "Something newer than this library",
                        "conditions": [{ "type": "not-a-real-condition", "key": "license", "values": ["trial"] }]
                    },
                    {
                        "name": "Beta ring",
                        "conditions": [{ "type": "context-attribute-is-one-of", "key": "ring", "values": ["beta"] }]
                    }
                ]
            }
        `;

        const result = flag(json).evaluate(Contexts.openFeature(Contexts.TargetingKey, { license: "trial", ring: "beta" }));

        expect(result).toEqual({ value: true, reason: "Matched rule 'Beta ring'." });
    });
});
