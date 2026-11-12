import { OctopusFeatureProvider } from "./octopusFeatureProvider.js";
import { ErrorCode, OpenFeature, ProviderEvents, ProviderNotReadyError, ProviderStatus } from "@openfeature/server-sdk";
import { silentLogger } from "../../core/src/testing/logger.js";
import { FeatureFlagApiClient, ProductMetadata, RawEvaluationResponse } from "@octopusdeploy/openfeature-core";
import { PROVIDER_VERSION } from "./version.js";
import { OctopusFeatureConfiguration } from "./octopusFeatureConfiguration.js";

// Only the API client is replaced. The parser and evaluator stay real, so the tests below serve evaluations as the
// endpoint returns them.
jest.mock("@octopusdeploy/openfeature-core", () => {
    const core = jest.requireActual<typeof import("@octopusdeploy/openfeature-core")>("@octopusdeploy/openfeature-core");
    return { ...core, FeatureFlagApiClient: jest.fn() };
});

const buildProvider = (configuration: Partial<OctopusFeatureConfiguration> = {}) =>
    new OctopusFeatureProvider({
        clientIdentifier: "test",
        productMetadata: new ProductMetadata("TestClient"),
        logger: silentLogger(),
        ...configuration,
    });

const serveEvaluations = (...evaluations: object[]) => {
    const response: RawEvaluationResponse = { evaluations, contentHash: "hash" };
    jest.mocked(FeatureFlagApiClient).prototype.getServerSideEvaluations = jest.fn().mockResolvedValue(response);
};

const serveNothingUsable = () => {
    jest.mocked(FeatureFlagApiClient).prototype.getServerSideEvaluations = jest.fn().mockResolvedValue(undefined);
};

beforeEach(() => {
    jest.mocked(FeatureFlagApiClient).mockClear();
});

afterEach(async () => {
    await OpenFeature.clearProviders();
});

describe("Evaluation context is supplied per evaluation", () => {
    beforeEach(async () => {
        serveEvaluations({
            slug: "segmented-feature",
            evaluationKey: "evaluation-key",
            rules: [
                {
                    name: "Client-side targeting",
                    conditions: [{ type: "context-attribute-is-one-of", key: "serverUri", values: ["app.example.com"] }],
                },
            ],
        });
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
        serveEvaluations({ slug: "feature-a", value: true, reason: "The flag is enabled for this environment." });
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
        serveEvaluations({ slug: "feature-a", value: true }); // value with no reason: malformed
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
    beforeEach(() => serveNothingUsable());

    test("Fails initialization, so the caller that set it learns the flags are unavailable", async () => {
        await expect(OpenFeature.setProviderAndWait(buildProvider())).rejects.toThrow(ProviderNotReadyError);
    });

    test("Moves the provider to ERROR and emits PROVIDER_ERROR with the reason", async () => {
        const onError = jest.fn();
        OpenFeature.addHandler(ProviderEvents.Error, onError);

        try {
            await expect(OpenFeature.setProviderAndWait(buildProvider())).rejects.toBeDefined();

            expect(OpenFeature.getClient().providerStatus).toBe(ProviderStatus.ERROR);
            expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "Unable to retrieve feature flags." }));
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
        jest.mocked(FeatureFlagApiClient).prototype.getServerSideEvaluations = jest
            .fn()
            .mockResolvedValueOnce({ evaluations: [], contentHash: "hash" })
            .mockResolvedValueOnce(undefined);
        const provider = buildProvider();
        await OpenFeature.setProviderAndWait(provider);
        await OpenFeature.clearProviders();

        await expect(OpenFeature.setProviderAndWait(provider)).rejects.toThrow(ProviderNotReadyError);

        expect((await OpenFeature.getClient().getBooleanDetails("feature-a", false)).errorCode).toBe(ErrorCode.PROVIDER_NOT_READY);
    });

    // Aborting does nothing to a response that has already arrived, so the earlier start's fetch can still finish.
    test("Does not install evaluations from an earlier start whose fetch finishes after it was closed", async () => {
        let finishFirstFetch: (response: RawEvaluationResponse) => void = () => undefined;
        jest.mocked(FeatureFlagApiClient).prototype.getServerSideEvaluations = jest
            .fn()
            .mockReturnValueOnce(new Promise((resolve) => (finishFirstFetch = resolve)))
            .mockResolvedValueOnce(undefined);
        const provider = buildProvider();

        const firstStart = provider.initialize();
        await provider.onClose();
        const secondStart = provider.initialize();
        finishFirstFetch({ evaluations: [{ slug: "feature-a", value: true, reason: "The flag is enabled for this environment." }], contentHash: "hash" });

        await expect(firstStart).rejects.toThrow(ProviderNotReadyError);
        await expect(secondStart).rejects.toThrow(ProviderNotReadyError);
        await expect(provider.resolveBooleanEvaluation("feature-a", false, {})).rejects.toThrow(ProviderNotReadyError);
        await provider.onClose();
    });
});

test("Does not fetch evaluations for each evaluation", async () => {
    serveEvaluations({ slug: "feature-a", value: true, reason: "The flag is enabled for this environment." });
    await OpenFeature.setProviderAndWait(buildProvider());

    await OpenFeature.getClient().getBooleanValue("feature-a", false);
    await OpenFeature.getClient().getBooleanValue("feature-a", false);

    expect(jest.mocked(FeatureFlagApiClient).prototype.getServerSideEvaluations).toHaveBeenCalledTimes(1);
});

// Matches the .NET and Java providers: check the content hash every cacheDuration (one minute by default), fetch again
// only when it changed, keep the evaluations already held on any failure, and keep trying for as long as it is open.
describe("Polling for flag updates", () => {
    const oneMinute = 60_000;
    const enabled = "The flag is enabled for this environment.";
    const disabled = "The flag is disabled for this environment.";

    const evaluations = (value: boolean, contentHash: string): RawEvaluationResponse => ({
        evaluations: [{ slug: "feature-a", value, reason: value ? enabled : disabled }],
        contentHash,
    });

    let getServerSideEvaluations: jest.Mock;
    let haveFeaturesChanged: jest.Mock;

    const evaluateFeatureA = () => OpenFeature.getClient().getBooleanValue("feature-a", false);

    beforeEach(() => {
        jest.useFakeTimers();
        getServerSideEvaluations = jest.fn().mockResolvedValue(evaluations(true, "first"));
        haveFeaturesChanged = jest.fn().mockResolvedValue(false);
        jest.mocked(FeatureFlagApiClient).prototype.getServerSideEvaluations = getServerSideEvaluations;
        jest.mocked(FeatureFlagApiClient).prototype.haveFeaturesChanged = haveFeaturesChanged;
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
        // A timer left behind here is one close failed to clear.
        expect(jest.getTimerCount()).toBe(0);
        jest.useRealTimers();
    });

    test("Checks for changes once a minute by default", async () => {
        await OpenFeature.setProviderAndWait(buildProvider());

        await jest.advanceTimersByTimeAsync(oneMinute - 1);
        expect(haveFeaturesChanged).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1);
        expect(haveFeaturesChanged).toHaveBeenCalledTimes(1);
        expect(haveFeaturesChanged).toHaveBeenCalledWith("first", expect.any(AbortSignal));

        await jest.advanceTimersByTimeAsync(oneMinute);
        expect(haveFeaturesChanged).toHaveBeenCalledTimes(2);
    });

    test("Checks for changes on the configured interval", async () => {
        await OpenFeature.setProviderAndWait(buildProvider({ cacheDurationMs: 5_000 }));

        await jest.advanceTimersByTimeAsync(15_000);

        expect(haveFeaturesChanged).toHaveBeenCalledTimes(3);
    });

    test("Does not fetch the evaluations again while they are unchanged", async () => {
        await OpenFeature.setProviderAndWait(buildProvider());

        await jest.advanceTimersByTimeAsync(oneMinute * 3);

        expect(getServerSideEvaluations).toHaveBeenCalledTimes(1);
    });

    test("Evaluates against the new evaluations once they have changed", async () => {
        await OpenFeature.setProviderAndWait(buildProvider());
        expect(await evaluateFeatureA()).toBe(true);

        haveFeaturesChanged.mockResolvedValueOnce(true);
        getServerSideEvaluations.mockResolvedValueOnce(evaluations(false, "second"));
        await jest.advanceTimersByTimeAsync(oneMinute);

        expect(await evaluateFeatureA()).toBe(false);

        await jest.advanceTimersByTimeAsync(oneMinute);
        expect(haveFeaturesChanged).toHaveBeenLastCalledWith("second", expect.any(AbortSignal));
    });

    // Neither the .NET nor the Java provider emits an event when the evaluations change. See BMBB-1399.
    test("Does not emit PROVIDER_CONFIGURATION_CHANGED when the evaluations change", async () => {
        const onChanged = jest.fn();
        OpenFeature.addHandler(ProviderEvents.ConfigurationChanged, onChanged);
        try {
            await OpenFeature.setProviderAndWait(buildProvider());
            haveFeaturesChanged.mockResolvedValueOnce(true);
            getServerSideEvaluations.mockResolvedValueOnce(evaluations(false, "second"));

            await jest.advanceTimersByTimeAsync(oneMinute);

            expect(onChanged).not.toHaveBeenCalled();
        } finally {
            OpenFeature.removeHandler(ProviderEvents.ConfigurationChanged, onChanged);
        }
    });

    test.each([
        ["the check fails", () => haveFeaturesChanged.mockRejectedValueOnce(new Error("Network Error"))],
        [
            "fetching the changed evaluations fails",
            () => {
                haveFeaturesChanged.mockResolvedValueOnce(true);
                getServerSideEvaluations.mockResolvedValueOnce(undefined);
            },
        ],
    ])("Keeps the evaluations it has, stays READY, and tries again next interval when %s", async (_, arrangeFailure) => {
        await OpenFeature.setProviderAndWait(buildProvider());
        arrangeFailure();

        await jest.advanceTimersByTimeAsync(oneMinute);

        expect(await evaluateFeatureA()).toBe(true);
        expect(OpenFeature.getClient().providerStatus).toBe(ProviderStatus.READY);

        haveFeaturesChanged.mockResolvedValueOnce(true);
        getServerSideEvaluations.mockResolvedValueOnce(evaluations(false, "second"));
        await jest.advanceTimersByTimeAsync(oneMinute);

        expect(await evaluateFeatureA()).toBe(false);
    });

    // Initialization still rejects, as it did before polling, but the provider keeps trying like .NET and Java do.
    test("Recovers from a failed initialization once the flags can be fetched", async () => {
        getServerSideEvaluations.mockResolvedValueOnce(undefined);
        const onReady = jest.fn();
        OpenFeature.addHandler(ProviderEvents.Ready, onReady);
        try {
            await expect(OpenFeature.setProviderAndWait(buildProvider())).rejects.toBeDefined();
            expect(OpenFeature.getClient().providerStatus).toBe(ProviderStatus.ERROR);

            await jest.advanceTimersByTimeAsync(oneMinute);

            // Nothing was held to compare against, so it fetches without checking first.
            expect(haveFeaturesChanged).not.toHaveBeenCalled();
            expect(OpenFeature.getClient().providerStatus).toBe(ProviderStatus.READY);
            expect(onReady).toHaveBeenCalled();
            expect(await evaluateFeatureA()).toBe(true);
        } finally {
            OpenFeature.removeHandler(ProviderEvents.Ready, onReady);
        }
    });

    test("Stops polling when closed", async () => {
        await OpenFeature.setProviderAndWait(buildProvider());

        await OpenFeature.clearProviders();
        await jest.advanceTimersByTimeAsync(oneMinute * 3);

        expect(haveFeaturesChanged).not.toHaveBeenCalled();
    });

    test("Abandons a refresh that is under way when closed", async () => {
        haveFeaturesChanged.mockImplementationOnce(
            (_: string, signal: AbortSignal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason)))
        );
        await OpenFeature.setProviderAndWait(buildProvider());
        await jest.advanceTimersByTimeAsync(oneMinute);
        expect(haveFeaturesChanged).toHaveBeenCalledTimes(1);

        await OpenFeature.clearProviders();
        await jest.advanceTimersByTimeAsync(oneMinute * 3);

        expect(haveFeaturesChanged).toHaveBeenCalledTimes(1);
    });

    test("Does not keep the Node process alive while waiting to poll", async () => {
        const setTimeoutSpy = jest.spyOn(global, "setTimeout");
        await OpenFeature.setProviderAndWait(buildProvider());

        const timers = setTimeoutSpy.mock.results.map((result) => result.value as NodeJS.Timeout);
        expect(timers).not.toHaveLength(0);
        expect(timers.every((timer) => !timer.hasRef())).toBe(true);
    });

    test("Polls on one timer only after being initialized again", async () => {
        const provider = buildProvider();
        await OpenFeature.setProviderAndWait(provider);
        await OpenFeature.clearProviders();
        await OpenFeature.setProviderAndWait(provider);

        await jest.advanceTimersByTimeAsync(oneMinute);

        expect(haveFeaturesChanged).toHaveBeenCalledTimes(1);
    });

    test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 31])("Rejects a cacheDurationMs of %p", (cacheDurationMs) => {
        expect(() => buildProvider({ cacheDurationMs })).toThrow(RangeError);
    });
});

// The X-Octopus-Client header is how backend telemetry tells server traffic apart from other providers.
test("Identifies itself to the API client as the server provider", () => {
    buildProvider();

    expect(FeatureFlagApiClient).toHaveBeenCalledWith(
        expect.objectContaining({ providerMetadata: { name: "openfeature-provider-ts-server", version: PROVIDER_VERSION } })
    );
});

test("Reports the metadata name backend telemetry expects", () => {
    expect(buildProvider().metadata.name).toBe("octopus-ts-server-provider");
});
