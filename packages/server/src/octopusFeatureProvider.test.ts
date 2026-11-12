import { OctopusFeatureProvider } from "./octopusFeatureProvider.js";
import { ErrorCode, OpenFeature, ProviderEvents, ProviderNotReadyError, ProviderStatus } from "@openfeature/server-sdk";
import { silentLogger } from "../../core/src/testing/logger.js";
import {
    ClientSideRule,
    ContextAttributeIsOneOfCondition,
    FeatureFlagApiClient,
    FeatureFlagEvaluator,
    ProductMetadata,
    ServerSideEvaluation,
} from "@octopusdeploy/openfeature-core";
import { PROVIDER_VERSION } from "./version.js";

// Only the API client is replaced. The evaluator and wire contract stay real, so the tests below can build evaluators.
jest.mock("@octopusdeploy/openfeature-core", () => {
    const core = jest.requireActual<typeof import("@octopusdeploy/openfeature-core")>("@octopusdeploy/openfeature-core");
    return { ...core, FeatureFlagApiClient: jest.fn() };
});

const buildProvider = () =>
    new OctopusFeatureProvider({
        clientIdentifier: "test",
        productMetadata: new ProductMetadata("TestClient"),
        logger: silentLogger(),
    });

const serveEvaluations = (...evaluations: ServerSideEvaluation[]) => {
    jest.mocked(FeatureFlagApiClient).prototype.getEvaluator = jest
        .fn()
        .mockResolvedValue(new FeatureFlagEvaluator({ evaluations, contentHash: "hash" }, silentLogger()));
};

beforeEach(() => {
    jest.mocked(FeatureFlagApiClient).mockClear();
});

afterEach(async () => {
    await OpenFeature.clearProviders();
});

describe("Evaluation context is supplied per evaluation", () => {
    beforeEach(async () => {
        serveEvaluations(
            new ServerSideEvaluation("segmented-feature", undefined, undefined, "evaluation-key", [
                new ClientSideRule("Client-side targeting", [new ContextAttributeIsOneOfCondition("serverUri", ["app.example.com"])]),
            ])
        );
        await OpenFeature.setProviderAndWait(buildProvider());
    });

    test("Matches a segment from the context passed with the evaluation", async () => {
        expect(await OpenFeature.getClient().getBooleanValue("segmented-feature", false, { serverUri: "app.example.com" })).toBe(true);
    });

    // One provider serves every user of a server, so nothing from one user's evaluation may reach the next. This
    // fails if the provider keeps the last context it saw and falls back to it, as web keeps its static context.
    test("Does not carry one evaluation's context into the next", async () => {
        const client = OpenFeature.getClient();

        expect(await client.getBooleanValue("segmented-feature", false, { serverUri: "app.example.com" })).toBe(true);
        expect(await client.getBooleanValue("segmented-feature", false, { serverUri: "other.example.com" })).toBe(false);
        expect(await client.getBooleanValue("segmented-feature", false, { serverUri: "app.example.com" })).toBe(true);
        expect(await client.getBooleanValue("segmented-feature", false)).toBe(false);
    });

    test("Merges the client's context with the evaluation's", async () => {
        const client = OpenFeature.getClient();
        client.setContext({ serverUri: "app.example.com" });

        expect(await client.getBooleanValue("segmented-feature", false)).toBe(true);
    });
});

describe("Flag type errors are surfaced correctly", () => {
    beforeEach(async () => {
        serveEvaluations(new ServerSideEvaluation("feature-a", true, "The flag is enabled for this environment."));
        await OpenFeature.setProviderAndWait(buildProvider());
    });

    test.each([
        ["string", (flagKey: string) => OpenFeature.getClient().getStringDetails(flagKey, "default")],
        ["number", (flagKey: string) => OpenFeature.getClient().getNumberDetails(flagKey, 0)],
        ["object", (flagKey: string) => OpenFeature.getClient().getObjectDetails(flagKey, {})],
    ])("A known flag requested as %s reports TYPE_MISMATCH, and an unknown one FLAG_NOT_FOUND", async (_, evaluate) => {
        expect((await evaluate("feature-a")).errorCode).toBe(ErrorCode.TYPE_MISMATCH);
        expect((await evaluate("nonexistent")).errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
    });
});

describe("Unsuccessful boolean evaluations surface the OpenFeature error contract", () => {
    beforeEach(async () => {
        serveEvaluations(new ServerSideEvaluation("feature-a", true)); // value with no reason: malformed
        await OpenFeature.setProviderAndWait(buildProvider());
    });

    test("An unrecognised slug resolves to the caller's default value with FLAG_NOT_FOUND", async () => {
        const result = await OpenFeature.getClient().getBooleanDetails("nonexistent", true);

        expect(result).toMatchObject({ value: true, errorCode: ErrorCode.FLAG_NOT_FOUND, reason: "ERROR" });
    });

    test("A malformed evaluation resolves to the caller's default value with PARSE_ERROR", async () => {
        const result = await OpenFeature.getClient().getBooleanDetails("feature-a", false);

        expect(result).toMatchObject({ value: false, errorCode: ErrorCode.PARSE_ERROR, reason: "ERROR" });
    });
});

// Without evaluations we cannot tell an unknown slug from one we never received, so initialization fails: the SDK moves
// the provider to ERROR, and every evaluation reports PROVIDER_NOT_READY rather than FLAG_NOT_FOUND.
describe("A provider that retrieved no evaluations", () => {
    const unavailable = new ProviderNotReadyError("Unable to retrieve feature flags, and no cached evaluations are available.");

    beforeEach(() => {
        jest.mocked(FeatureFlagApiClient).prototype.getEvaluator = jest.fn().mockRejectedValue(unavailable);
    });

    test("Fails initialization, so the caller that set it learns the flags are unavailable", async () => {
        await expect(OpenFeature.setProviderAndWait(buildProvider())).rejects.toBe(unavailable);
    });

    test("Moves the provider to ERROR and emits PROVIDER_ERROR with the reason", async () => {
        const onError = jest.fn();
        OpenFeature.addHandler(ProviderEvents.Error, onError);

        try {
            await expect(OpenFeature.setProviderAndWait(buildProvider())).rejects.toBeDefined();

            expect(OpenFeature.getClient().providerStatus).toBe(ProviderStatus.ERROR);
            expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: unavailable.message }));
        } finally {
            OpenFeature.removeHandler(ProviderEvents.Error, onError);
        }
    });

    test.each([
        ["boolean", (flagKey: string) => OpenFeature.getClient().getBooleanDetails(flagKey, false)],
        ["string", (flagKey: string) => OpenFeature.getClient().getStringDetails(flagKey, "default")],
        ["number", (flagKey: string) => OpenFeature.getClient().getNumberDetails(flagKey, 0)],
        ["object", (flagKey: string) => OpenFeature.getClient().getObjectDetails(flagKey, {})],
    ])("Reports PROVIDER_NOT_READY for %s evaluations rather than passing an outage off as an unrecognised slug", async (_, evaluate) => {
        await expect(OpenFeature.setProviderAndWait(buildProvider())).rejects.toBeDefined();

        expect(await evaluate("feature-a")).toMatchObject({ errorCode: ErrorCode.PROVIDER_NOT_READY, reason: "ERROR" });
    });

    // The SDK initializes the same provider again when it is set after being removed.
    test("Does not keep evaluations from an earlier start when initialized again", async () => {
        jest.mocked(FeatureFlagApiClient).prototype.getEvaluator = jest
            .fn()
            .mockResolvedValueOnce(new FeatureFlagEvaluator({ evaluations: [], contentHash: "hash" }, silentLogger()))
            .mockRejectedValueOnce(unavailable);
        const provider = buildProvider();
        await OpenFeature.setProviderAndWait(provider);
        await OpenFeature.clearProviders();

        await expect(OpenFeature.setProviderAndWait(provider)).rejects.toBe(unavailable);

        expect((await OpenFeature.getClient().getBooleanDetails("feature-a", false)).errorCode).toBe(ErrorCode.PROVIDER_NOT_READY);
    });
});

test("Fetches evaluations once, when it initializes", async () => {
    serveEvaluations(new ServerSideEvaluation("feature-a", true, "The flag is enabled for this environment."));
    await OpenFeature.setProviderAndWait(buildProvider());

    await OpenFeature.getClient().getBooleanValue("feature-a", false);
    await OpenFeature.getClient().getBooleanValue("feature-a", false);

    expect(jest.mocked(FeatureFlagApiClient).prototype.getEvaluator).toHaveBeenCalledTimes(1);
});

// The X-Octopus-Client header is how backend telemetry tells server traffic apart from other providers.
test("Identifies itself to the API client as the server provider", () => {
    buildProvider();

    expect(FeatureFlagApiClient).toHaveBeenCalledWith(
        expect.objectContaining({ providerMetadata: { name: "openfeature-provider-ts-server", version: PROVIDER_VERSION } })
    );
});

// The API client falls back to its cache when a fetch fails. A cache that held anything would let a failed fetch serve
// evaluations from an earlier start, which the tests above can't catch because they replace the client.
test("Gives the API client a cache that never returns evaluations", () => {
    buildProvider();

    const [{ cache }] = jest.mocked(FeatureFlagApiClient).mock.calls[0];
    cache.write({ evaluations: [], contentHash: "hash" });

    expect(cache.read()).toBeUndefined();
});

test("Reports the metadata name backend telemetry expects", () => {
    expect(buildProvider().metadata.name).toBe("octopus-ts-server-provider");
});
