import { FeatureToggles, OctopusFeatureContext } from "./octopusFeatureContext";
import { ErrorCode } from "@openfeature/core";

describe("Given a set of feature toggles", () => {
    test("Evaluates to true if feature is contained within the set and enabled", () => {
        const toggles: FeatureToggles = {
            evaluations: [
                {
                    name: "enabledfeature",
                    slug: "enabled-feature",
                    isEnabled: true,
                    segments: {},
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        expect(context.evaluate("enabled-feature", false, {})).toStrictEqual({ value: true });
    });

    test("Evaluates to true if feature is contained within the set and enabled, and evaluation casing differs", () => {
        const toggles: FeatureToggles = {
            evaluations: [
                {
                    name: "enabledfeature",
                    slug: "enabled-feature",
                    isEnabled: true,
                    segments: {},
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        expect(context.evaluate("Enabled-Feature", false, {})).toStrictEqual({ value: true });
    });

    test("Evaluates to false if feature is contained within the set but is not enabled", () => {
        const toggles: FeatureToggles = {
            evaluations: [
                {
                    name: "enabledfeature",
                    slug: "enabled-feature",
                    isEnabled: false,
                    segments: {},
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        expect(context.evaluate("enabled-feature", false, {})).toStrictEqual({ value: false });
    });

    describe("When flag key provided is not a slug", () => {
        const toggles: FeatureToggles = {
            evaluations: [
                {
                    name: "notaslug",
                    slug: "not-a-slug",
                    isEnabled: false,
                    segments: {},
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
        const toggles: FeatureToggles = {
            evaluations: [
                {
                    name: "notaslug",
                    slug: "not-a-slug",
                    isEnabled: false,
                    segments: {},
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
        const toggles: FeatureToggles = {
            evaluations: [
                {
                    name: "enabledfeature",
                    slug: "enabled-feature",
                    isEnabled: true,
                    segments: { region: "us" },
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
        const toggles: FeatureToggles = {
            evaluations: [
                {
                    name: "enabledfeature",
                    slug: "enabled-feature",
                    isEnabled: true,
                    segments: {},
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
        const toggles: FeatureToggles = {
            evaluations: [
                {
                    name: "enabledfeature",
                    slug: "enabled-feature",
                    isEnabled: true,
                    segments: { region: "us", license: "trial" },
                },
            ],
            contentHash: "",
        };

        const context = new OctopusFeatureContext(toggles);

        test("Evaluates to true if all segments are specified", () => {
            const result = context.evaluate("enabled-feature", false, { region: "us", license: "trial" });
            expect(result).toStrictEqual({ value: true });
        });

        test("Evaluates to true if a superset of segments is specified", () => {
            const result = context.evaluate("enabled-feature", false, { region: "us", license: "trial", color: "red" });
            expect(result).toStrictEqual({ value: true });
        });

        test("Evaluates to true if a subset of segments is specified", () => {
            const result = context.evaluate("enabled-feature", false, { region: "us" });
            expect(result).toStrictEqual({ value: true });
        });

        test("Evaluates to false a non-matching segment is specified", () => {
            const result = context.evaluate("enabled-feature", false, { locale: "en-us" });
            expect(result).toStrictEqual({ value: false });
        });

        test("Evaluates to false if no segment is specified", () => {
            const result = context.evaluate("enabled-feature", false, {});
            expect(result).toStrictEqual({ value: false });
        });
    });
});
