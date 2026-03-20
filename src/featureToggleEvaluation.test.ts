import { V1FeatureToggleEvaluation } from "./octopusFeatureContext";

describe("V1FeatureToggleEvaluation JSON deserialization", () => {
    it("deserializes an enabled toggle", () => {
        const json = `{"name":"My Feature","slug":"my-feature","isEnabled":true,"segments":[]}`;

        const result = JSON.parse(json) as V1FeatureToggleEvaluation;

        expect(result.name).toBe("My Feature");
        expect(result.slug).toBe("my-feature");
        expect(result.isEnabled).toBe(true);
        expect(result.segments).toStrictEqual([]);
    });

    it("deserializes a disabled toggle", () => {
        const json = `{"name":"My Feature","slug":"my-feature","isEnabled":false,"segments":[]}`;

        const result = JSON.parse(json) as V1FeatureToggleEvaluation;

        expect(result.isEnabled).toBe(false);
    });

    it("deserializes segments as key-value objects", () => {
        const json = `{"name":"My Feature","slug":"my-feature","isEnabled":true,"segments":[{"key":"license-type","value":"free"},{"key":"country","value":"au"}]}`;

        const result = JSON.parse(json) as V1FeatureToggleEvaluation;

        expect(result.segments).toStrictEqual([
            { key: "license-type", value: "free" },
            { key: "country", value: "au" },
        ]);
    });

    it("produces undefined for a missing segments field", () => {
        const json = `{"name":"My Feature","slug":"my-feature","isEnabled":true}`;

        const result = JSON.parse(json) as V1FeatureToggleEvaluation;

        expect(result.segments).toBeUndefined();
    });

    it("deserializes an array of toggles", () => {
        const json = `[{"name":"Feature A","slug":"feature-a","isEnabled":true,"segments":[]},{"name":"Feature B","slug":"feature-b","isEnabled":false,"segments":[]}]`;

        const result = JSON.parse(json) as V1FeatureToggleEvaluation[];

        expect(result).toHaveLength(2);
        expect(result[0].slug).toBe("feature-a");
        expect(result[0].isEnabled).toBe(true);
        expect(result[1].slug).toBe("feature-b");
        expect(result[1].isEnabled).toBe(false);
    });

    it("ignores extraneous properties", () => {
        const json = `{
                       "name": "My Feature",
                       "slug": "my-feature",
                       "isEnabled": true,
                       "segments": [],
                       "foo": "bar",
                       "qux": 123,
                       "wux": {
                           "nested": "value"
                       }
                   }`;

        const result = JSON.parse(json) as V1FeatureToggleEvaluation;

        expect(result.name).toBe("My Feature");
        expect(result.slug).toBe("my-feature");
        expect(result.isEnabled).toBe(true);
        expect(result.segments).toStrictEqual([]);
    })
});
