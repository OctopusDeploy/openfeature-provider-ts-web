import * as core from "./index.js";

test("the entry point exports what the providers consume", () => {
    expect(Object.keys(core).sort()).toEqual([
        "ClientSideRule",
        "ContextAttributeIsOneOfCondition",
        "FeatureFlagEvaluator",
        "ProductMetadata",
        "ServerSideEvaluation",
        "octopusHttpHeaderNames",
        "parseServerSideEvaluations",
    ]);
});
