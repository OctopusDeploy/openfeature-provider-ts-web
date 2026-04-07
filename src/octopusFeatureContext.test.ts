import { V2FeatureToggles, OctopusFeatureContext } from "./octopusFeatureContext";
import { ErrorCode } from "@openfeature/core";

describe("Given a set of feature toggles", () => {
    test("Evaluates to true if feature is contained within the set and enabled", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "enabled-feature",
                    isEnabled: true,
                    evaluationKey: "evaluation-key",
                    segments: [],
                    clientRolloutPercentage: 100,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        expect(context.evaluate("enabled-feature", false, {})).toStrictEqual({ value: true });
    });

    test("Evaluates to true if feature is contained within the set and enabled, and evaluation casing differs", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "enabled-feature",
                    isEnabled: true,
                    evaluationKey: "evaluation-key",
                    segments: [],
                    clientRolloutPercentage: 100,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        expect(context.evaluate("Enabled-Feature", false, {})).toStrictEqual({ value: true });
    });

    test("Evaluates to false if feature is contained within the set but is not enabled", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "enabled-feature",
                    isEnabled: false,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        expect(context.evaluate("enabled-feature", false, {})).toStrictEqual({ value: false });
    });

    describe("When flag key provided is not a slug", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "not-a-slug",
                    isEnabled: false,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        const result = context.evaluate("not a slug", true, {});

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
                    slug: "not-a-slug",
                    isEnabled: false,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        const result = context.evaluate("does-not-exist", true, {});

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
                    slug: "enabled-feature",
                    isEnabled: true,
                    evaluationKey: "evaluation-key",
                    segments: [{ key: "region", value: "us" }],
                    clientRolloutPercentage: 100,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        test("Evaluates to true if the segment is specified", () => {
            const result = context.evaluate("enabled-feature", false, { region: "us" });
            expect(result).toStrictEqual({ value: true });
        });

        test("Evaluates to false if an invalid segment is specified", () => {
            const result = context.evaluate("enabled-feature", false, { locale: "en-us" });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to false if no segment is specified", () => {
            const result = context.evaluate("enabled-feature", false, {});
            expect(result).toStrictEqual({ value: false });
        });
    });

    describe("When a feature is not toggled on for a specific segment", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "enabled-feature",
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
            const result = context.evaluate("enabled-feature", false, { region: "us" });
            expect(result).toStrictEqual({ value: true });
        });
    });

    describe("When a feature is toggled on for multiple segments", () => {
        const toggles: V2FeatureToggles = {
            evaluations: [
                {
                    slug: "enabled-feature",
                    isEnabled: true,
                    evaluationKey: "evaluation-key",
                    segments: [
                        { key: "region", value: "us" },
                        { key: "license", value: "trial" },
                    ],
                    clientRolloutPercentage: 100,
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        test("Evaluates to true if all segments are specified in context", () => {
            const result = context.evaluate("enabled-feature", false, { region: "us", license: "trial" });
            expect(result).toStrictEqual({ value: true });
        });

        test("Evaluates to false if all segments are specified in context, but one does not match the toggle", () => {
            const result = context.evaluate("enabled-feature", false, { region: "eu", license: "trial" });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to true if a superset of segments is specified in context", () => {
            const result = context.evaluate("enabled-feature", false, { region: "us", license: "trial", color: "red" });
            expect(result).toStrictEqual({ value: true });
        });

        test("Evaluates to false if a subset of segments is specified in context", () => {
            const result = context.evaluate("enabled-feature", false, { region: "us" });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to false if no context values match toggled segment values", () => {
            const result = context.evaluate("enabled-feature", false, { locale: "en-us" });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to false if no segment is specified in context", () => {
            const result = context.evaluate("enabled-feature", false, {});
            expect(result).toStrictEqual({ value: false });
        });
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
