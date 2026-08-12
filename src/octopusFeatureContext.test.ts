import { V2FeatureToggles, OctopusFeatureContext } from "./octopusFeatureContext";
import { ErrorCode } from "@openfeature/core";

describe("Given a set of feature toggles", () => {
    test("Evaluates to true if feature is contained within the set and enabled", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "test-feature",
                    isEnabled: true,
                    evaluationKey: "evaluation-key",
                    segments: [],
                    clientRolloutPercentage: 100,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        expect(context.evaluate("test-feature", false, {})).toStrictEqual({ value: true });
    });

    test("Evaluates to true if feature is contained within the set and enabled, and evaluation casing differs", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "test-feature",
                    isEnabled: true,
                    evaluationKey: "evaluation-key",
                    segments: [],
                    clientRolloutPercentage: 100,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        expect(context.evaluate("Test-Feature", false, {})).toStrictEqual({ value: true });
    });

    test("Evaluates to false if feature is contained within the set but is not enabled", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "test-feature",
                    isEnabled: false,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        expect(context.evaluate("test-feature", false, {})).toStrictEqual({ value: false });
    });

    describe("When flag key provided is not a slug", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "this-is-clearly-not-a-slug",
                    isEnabled: false,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        const result = context.evaluate("This is clearly not a slug!", true, {});

        test("Then error code is flag not found", () => {
            expect(result.errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
        });

        test("Then the default value is returned", () => {
            expect(result.value).toBe(true);
        });
    });

    describe("When flag is not present within the set", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "testfeature",
                    isEnabled: false,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        const result = context.evaluate("anotherfeature", true, {});

        test("Then error code is flag not found", () => {
            expect(result.errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
        });

        test("Then the default value is returned", () => {
            expect(result.value).toBe(true);
        });
    });

    describe("When a feature is toggled on for a specific segment", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "testfeature",
                    isEnabled: true,
                    evaluationKey: "evaluation-key",
                    segments: [{ key: "license", value: "trial" }],
                    clientRolloutPercentage: 100,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        test("Evaluates to true if the segment is specified", () => {
            const result = context.evaluate("testfeature", false, { license: "trial" });
            expect(result).toStrictEqual({ value: true });
        });

        test("Evaluates to false if an invalid segment is specified", () => {
            const result = context.evaluate("testfeature", false, { other: "segment" });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to false if no segment is specified", () => {
            const result = context.evaluate("testfeature", false, {});
            expect(result).toStrictEqual({ value: false });
        });
    });

    describe("When a feature is not toggled on for a specific segment", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "testfeature",
                    isEnabled: true,
                    evaluationKey: "evaluation-key",
                    segments: [],
                    clientRolloutPercentage: 100,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        test("Evaluates to true regardless of the segment specified", () => {
            const result = context.evaluate("testfeature", false, { license: "trial" });
            expect(result).toStrictEqual({ value: true });
        });

        test("Evaluates to true when no context values are specified", () => {
            const result = context.evaluate("testfeature", false, {});
            expect(result).toStrictEqual({ value: true });
        });
    });

    describe("When a feature is toggled on for multiple segments", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "testfeature",
                    isEnabled: true,
                    evaluationKey: "evaluation-key",
                    segments: [
                        { key: "license", value: "trial" },
                        { key: "region", value: "au" },
                        { key: "region", value: "us" },
                    ],
                    clientRolloutPercentage: 100,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        test("Evaluates to true if a matching context value is present for each toggled segment", () => {
            const result = context.evaluate("testfeature", false, { license: "trial", region: "us" });
            expect(result).toStrictEqual({ value: true });
        });

        test("Evaluates to false if a context value is present for each toggled segment but one does not match", () => {
            const result = context.evaluate("testfeature", false, { license: "trial", region: "eu" });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to true if a matching context value is present for each toggled segment and an additional segment is present", () => {
            const result = context.evaluate("testfeature", false, { license: "trial", region: "us", language: "english" });
            expect(result).toStrictEqual({ value: true });
        });

        test("Evaluates to false if a context value is present for only one of the toggled segments", () => {
            const result = context.evaluate("testfeature", false, { license: "trial" });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to false if no context values are present for any of the toggled segments", () => {
            const result = context.evaluate("testfeature", true, { other: "segment" });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to false if no context values are specified", () => {
            const result = context.evaluate("testfeature", true, {});
            expect(result).toStrictEqual({ value: false });
        });
    });

    describe("When a feature is toggled on for a specific segment and context is missing the segment key", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "testfeature",
                    isEnabled: true,
                    evaluationKey: "evaluation-key",
                    segments: [{ key: "license", value: "trial" }],
                    clientRolloutPercentage: 100,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        test("Evaluates to false if the segment key is present but has a null value", () => {
            const result = context.evaluate("testfeature", false, { license: null as unknown as string });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to false if a different segment key is specified", () => {
            const result = context.evaluate("testfeature", false, { other: "segment" });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to false if no context values are specified", () => {
            const result = context.evaluate("testfeature", false, {});
            expect(result).toStrictEqual({ value: false });
        });
    });
});

describe("Rollout percentage evaluation", () => {
    // "evaluation-key:targeting-key" hashes to bucket 13
    const evaluationKey = "evaluation-key";
    const targetingKey = "targeting-key";

    test("Evaluates to true when targeting key falls within rollout percentage and no segments required", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [{ slug: "test-feature", isEnabled: true, evaluationKey, segments: [], clientRolloutPercentage: 13 }],
            contentHash: "",
        };
        const result = new OctopusFeatureContext(toggles).evaluate("test-feature", false, { targetingKey });
        expect(result).toStrictEqual({ value: true });
    });

    test("Evaluates to false when targeting key falls outside rollout percentage and no segments required", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [{ slug: "test-feature", isEnabled: true, evaluationKey, segments: [], clientRolloutPercentage: 12 }],
            contentHash: "",
        };
        const result = new OctopusFeatureContext(toggles).evaluate("test-feature", false, { targetingKey });
        expect(result).toStrictEqual({ value: false });
    });

    test("Evaluates to true when targeting key falls within rollout percentage and segment matches", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                { slug: "test-feature", isEnabled: true, evaluationKey, segments: [{ key: "license", value: "trial" }], clientRolloutPercentage: 13 },
            ],
            contentHash: "",
        };
        const result = new OctopusFeatureContext(toggles).evaluate("test-feature", false, { targetingKey, license: "trial" });
        expect(result).toStrictEqual({ value: true });
    });

    test("Evaluates to false when targeting key falls within rollout percentage but segment does not match", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                { slug: "test-feature", isEnabled: true, evaluationKey, segments: [{ key: "license", value: "enterprise" }], clientRolloutPercentage: 99 },
            ],
            contentHash: "",
        };
        const result = new OctopusFeatureContext(toggles).evaluate("test-feature", false, { targetingKey, license: "trial" });
        expect(result).toStrictEqual({ value: false });
    });

    test("Evaluates to false when targeting key falls outside rollout percentage and segment does not match", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                { slug: "test-feature", isEnabled: true, evaluationKey, segments: [{ key: "license", value: "enterprise" }], clientRolloutPercentage: 12 },
            ],
            contentHash: "",
        };
        const result = new OctopusFeatureContext(toggles).evaluate("test-feature", false, { targetingKey, license: "trial" });
        expect(result).toStrictEqual({ value: false });
    });

    test("Evaluates to false when no targeting key and rollout is less than 100%", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [{ slug: "test-feature", isEnabled: true, evaluationKey, segments: [], clientRolloutPercentage: 99 }],
            contentHash: "",
        };
        const result = new OctopusFeatureContext(toggles).evaluate("test-feature", false, {});
        expect(result).toStrictEqual({ value: false });
    });

    test("Evaluates to true when no targeting key and rollout is 100%", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [{ slug: "test-feature", isEnabled: true, evaluationKey, segments: [], clientRolloutPercentage: 100 }],
            contentHash: "",
        };
        const result = new OctopusFeatureContext(toggles).evaluate("test-feature", false, {});
        expect(result).toStrictEqual({ value: true });
    });
});

describe("When an enabled toggle is missing required client evaluation fields", () => {
    test("Returns PARSE_ERROR when evaluationKey is absent", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [{ slug: "feature-a", isEnabled: true, segments: [], clientRolloutPercentage: 100 }],
            contentHash: "",
        };
        const context = new OctopusFeatureContext(toggles);
        const result = context.evaluate("feature-a", false, {});
        expect(result.errorCode).toBe(ErrorCode.PARSE_ERROR);
        expect(result.errorMessage).toContain("missing necessary information for client-side evaluation");
        expect(result.value).toBe(false);
    });

    test("Returns PARSE_ERROR when segments is absent", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [{ slug: "feature-b", isEnabled: true, evaluationKey: "evaluation-key", clientRolloutPercentage: 100 }],
            contentHash: "",
        };
        const context = new OctopusFeatureContext(toggles);
        const result = context.evaluate("feature-b", false, {});
        expect(result.errorCode).toBe(ErrorCode.PARSE_ERROR);
        expect(result.errorMessage).toContain("missing necessary information for client-side evaluation");
        expect(result.value).toBe(false);
    });

    test("Returns PARSE_ERROR when clientRolloutPercentage is absent", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [{ slug: "feature-c", isEnabled: true, evaluationKey: "evaluation-key", segments: [] }],
            contentHash: "",
        };
        const context = new OctopusFeatureContext(toggles);
        const result = context.evaluate("feature-c", false, {});
        expect(result.errorCode).toBe(ErrorCode.PARSE_ERROR);
        expect(result.errorMessage).toContain("missing necessary information for client-side evaluation");
        expect(result.value).toBe(false);
    });

    test("Returns PARSE_ERROR when all three fields are absent", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [{ slug: "feature-d", isEnabled: true }],
            contentHash: "",
        };
        const context = new OctopusFeatureContext(toggles);
        const result = context.evaluate("feature-d", true, {});
        expect(result.errorCode).toBe(ErrorCode.PARSE_ERROR);
        expect(result.errorMessage).toContain("missing necessary information for client-side evaluation");
        expect(result.value).toBe(true);
    });

    test("Does not return PARSE_ERROR for a disabled toggle with absent fields", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [{ slug: "feature-e", isEnabled: false }],
            contentHash: "",
        };
        const context = new OctopusFeatureContext(toggles);
        const result = context.evaluate("feature-e", true, {});
        expect(result.errorCode).toBeUndefined();
        expect(result.value).toBe(false);
    });
});
