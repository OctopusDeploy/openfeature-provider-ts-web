import { OctopusFeatureProvider } from "./octopusFeatureProvider.js";
import { ProductMetadata } from "./productMetadata.js";
import { ErrorCode, OpenFeature, ProviderEvents, ProviderNotReadyError, ProviderStatus } from "@openfeature/web-sdk";
import { FeatureFlagApiClient } from "./featureFlagApiClient.js";
import { FeatureFlagEvaluator } from "./featureFlagEvaluator.js";
import { silentLogger } from "./testing/logger.js";
import { ClientSideRule } from "./v4/clientSideRule.js";
import { ContextAttributeIsOneOfCondition } from "./v4/conditions/contextAttributeIsOneOfCondition.js";
import { ServerSideEvaluation } from "./v4/serverSideEvaluation.js";
import { PROVIDER_VERSION } from "./version.js";

jest.mock("./featureFlagApiClient.js");

describe.skip("octopusFeatureProvider", () => {
    // Stub out local storage for this particular test
    global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
        removeItem: jest.fn(),
    };

    test("use this to verify that the provider is happy end to end", async () => {
        const client = new OctopusFeatureProvider({
            clientIdentifier: "TODO",
            productMetadata: new ProductMetadata("TestClient"),
        });

        await OpenFeature.setProviderAndWait(client);
        await OpenFeature.setContext({ username: "admin" });
        const result = OpenFeature.getClient().getBooleanValue("heartbeat", false, {});
        expect(result).toBe(true);
    });
});

describe("Context is available for segment evaluation immediately after provider is ready", () => {
    const context = { serverUri: "app.example.com" };

    beforeEach(async () => {
        await OpenFeature.setContext({});
        jest.mocked(FeatureFlagApiClient).mockClear();
        jest.mocked(FeatureFlagApiClient).prototype.getEvaluator = jest.fn().mockResolvedValue(
            new FeatureFlagEvaluator(
                {
                    evaluations: [
                        new ServerSideEvaluation("segmented-feature", undefined, undefined, "evaluation-key", [
                            new ClientSideRule("Client-side targeting", [new ContextAttributeIsOneOfCondition("serverUri", ["app.example.com"])]),
                        ]),
                    ],
                    contentHash: "",
                },
                silentLogger()
            )
        );
    });

    test("setContext before setProviderAndWait — SDK passes context to initialize", async () => {
        const provider = new OctopusFeatureProvider({
            clientIdentifier: "test",
            productMetadata: new ProductMetadata("TestClient"),
        });

        await OpenFeature.setContext(context);
        await OpenFeature.setProviderAndWait(provider);

        const result = OpenFeature.getClient().getBooleanValue("segmented-feature", false);
        expect(result).toBe(true);
    });

    test("setProviderAndWait with context — context passed directly to initialize", async () => {
        const provider = new OctopusFeatureProvider({
            clientIdentifier: "test",
            productMetadata: new ProductMetadata("TestClient"),
        });

        await OpenFeature.setProviderAndWait(provider, context);

        const result = OpenFeature.getClient().getBooleanValue("segmented-feature", false);
        expect(result).toBe(true);
    });

    // This pattern creates a race condition: the provider is READY but context is empty,
    // so any flag evaluation (e.g. from React hooks) between these two calls will fail
    // segment matching. Prefer calling setContext before setProviderAndWait to avoid this.
    test("setProviderAndWait then setContext — context is not available until setContext completes", async () => {
        const provider = new OctopusFeatureProvider({
            clientIdentifier: "test",
            productMetadata: new ProductMetadata("TestClient"),
        });

        await OpenFeature.setProviderAndWait(provider);

        const resultBeforeContext = OpenFeature.getClient().getBooleanValue("segmented-feature", false);
        expect(resultBeforeContext).toBe(false);

        await OpenFeature.setContext(context);

        const resultAfterContext = OpenFeature.getClient().getBooleanValue("segmented-feature", false);
        expect(resultAfterContext).toBe(true);
    });
});

describe("Flag type errors are surfaced correctly", () => {
    beforeEach(async () => {
        await OpenFeature.setContext({});
        jest.mocked(FeatureFlagApiClient).mockClear();
        jest.mocked(FeatureFlagApiClient).prototype.getEvaluator = jest
            .fn()
            .mockResolvedValue(
                new FeatureFlagEvaluator(
                    { evaluations: [new ServerSideEvaluation("feature-a", true, "The flag is enabled for this environment.")], contentHash: "" },
                    silentLogger()
                )
            );
        const provider = new OctopusFeatureProvider({
            clientIdentifier: "test",
            productMetadata: new ProductMetadata("TestClient"),
        });
        await OpenFeature.setProviderAndWait(provider);
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
    });

    test("givenAKnownFlag_whenRequestedAsString_returnsTypeMismatch", () => {
        expect(OpenFeature.getClient().getStringDetails("feature-a", "default").errorCode).toBe(ErrorCode.TYPE_MISMATCH);
    });

    test("givenAnUnknownFlag_whenRequestedAsString_returnsFlagNotFound", () => {
        expect(OpenFeature.getClient().getStringDetails("nonexistent", "default").errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
    });

    test("givenAKnownFlag_whenRequestedAsNumber_returnsTypeMismatch", () => {
        expect(OpenFeature.getClient().getNumberDetails("feature-a", 0).errorCode).toBe(ErrorCode.TYPE_MISMATCH);
    });

    test("givenAnUnknownFlag_whenRequestedAsNumber_returnsFlagNotFound", () => {
        expect(OpenFeature.getClient().getNumberDetails("nonexistent", 0).errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
    });

    test("givenAKnownFlag_whenRequestedAsObject_returnsTypeMismatch", () => {
        expect(OpenFeature.getClient().getObjectDetails("feature-a", {}).errorCode).toBe(ErrorCode.TYPE_MISMATCH);
    });

    test("givenAnUnknownFlag_whenRequestedAsObject_returnsFlagNotFound", () => {
        expect(OpenFeature.getClient().getObjectDetails("nonexistent", {}).errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
    });
});

describe("Unsuccessful boolean evaluations surface the OpenFeature error contract", () => {
    beforeEach(async () => {
        await OpenFeature.setContext({});
        jest.mocked(FeatureFlagApiClient).mockClear();
        jest.mocked(FeatureFlagApiClient).prototype.getEvaluator = jest
            .fn()
            .mockResolvedValue(new FeatureFlagEvaluator({ evaluations: [new ServerSideEvaluation("feature-a", true)], contentHash: "" }, silentLogger())); // value with no reason: malformed
        const provider = new OctopusFeatureProvider({
            clientIdentifier: "test",
            productMetadata: new ProductMetadata("TestClient"),
        });
        await OpenFeature.setProviderAndWait(provider);
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
    });

    test("An unrecognised slug resolves to the caller's default value with FLAG_NOT_FOUND", () => {
        const result = OpenFeature.getClient().getBooleanDetails("nonexistent", true);

        expect(result).toMatchObject({ value: true, errorCode: ErrorCode.FLAG_NOT_FOUND, reason: "ERROR" });
    });

    test("A malformed evaluation resolves to the caller's default value with PARSE_ERROR", () => {
        const result = OpenFeature.getClient().getBooleanDetails("feature-a", false);

        expect(result).toMatchObject({ value: false, errorCode: ErrorCode.PARSE_ERROR, reason: "ERROR" });
    });
});

// Without evaluations we cannot tell an unknown slug from one we never received, so initialization fails: the SDK moves
// the provider to ERROR, and every evaluation reports PROVIDER_NOT_READY rather than FLAG_NOT_FOUND.
describe("A provider that retrieved no evaluations", () => {
    const unavailable = new ProviderNotReadyError("Unable to retrieve feature flags, and no cached evaluations are available.");

    const buildProvider = () =>
        new OctopusFeatureProvider({
            clientIdentifier: "test",
            productMetadata: new ProductMetadata("TestClient"),
            logger: silentLogger(),
        });

    const setProviderAndWaitForFailure = async () => {
        await expect(OpenFeature.setProviderAndWait(buildProvider())).rejects.toBeDefined();
    };

    beforeEach(async () => {
        await OpenFeature.setContext({});
        jest.mocked(FeatureFlagApiClient).mockClear();
        jest.mocked(FeatureFlagApiClient).prototype.getEvaluator = jest.fn().mockRejectedValue(unavailable);
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
    });

    test("Fails initialization, so the caller that set it learns the flags are unavailable", async () => {
        await expect(OpenFeature.setProviderAndWait(buildProvider())).rejects.toBe(unavailable);
    });

    test("Moves the provider to ERROR", async () => {
        await setProviderAndWaitForFailure();

        expect(OpenFeature.getClient().providerStatus).toBe(ProviderStatus.ERROR);
    });

    test("Emits PROVIDER_ERROR with the reason", async () => {
        const onError = jest.fn();
        OpenFeature.getClient().addHandler(ProviderEvents.Error, onError);

        try {
            await setProviderAndWaitForFailure();

            expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: unavailable.message }));
        } finally {
            OpenFeature.getClient().removeHandler(ProviderEvents.Error, onError);
        }
    });

    test("Passes an unexpected failure to the caller too", async () => {
        const unexpected = new TypeError("Cannot read properties of undefined");
        jest.mocked(FeatureFlagApiClient).prototype.getEvaluator = jest.fn().mockRejectedValue(unexpected);

        await expect(OpenFeature.setProviderAndWait(buildProvider())).rejects.toBe(unexpected);

        expect(OpenFeature.getClient().getBooleanDetails("feature-a", false).errorCode).toBe(ErrorCode.PROVIDER_NOT_READY);
    });

    test("Reports PROVIDER_NOT_READY rather than passing an outage off as an unrecognised slug", async () => {
        await setProviderAndWaitForFailure();

        const result = OpenFeature.getClient().getBooleanDetails("feature-a", false);

        expect(result).toMatchObject({ value: false, errorCode: ErrorCode.PROVIDER_NOT_READY, reason: "ERROR" });
    });

    test.each([
        ["string", (flagKey: string) => OpenFeature.getClient().getStringDetails(flagKey, "default")],
        ["number", (flagKey: string) => OpenFeature.getClient().getNumberDetails(flagKey, 0)],
        ["object", (flagKey: string) => OpenFeature.getClient().getObjectDetails(flagKey, {})],
    ])("Reports PROVIDER_NOT_READY for %s evaluations too", async (_, evaluate) => {
        await setProviderAndWaitForFailure();

        expect(evaluate("feature-a").errorCode).toBe(ErrorCode.PROVIDER_NOT_READY);
    });

    // web-sdk returns a provider to READY after any context change that resolves, which would announce flags that
    // never arrived.
    test("Stays in ERROR after a context change, without failing the caller that changed it", async () => {
        await setProviderAndWaitForFailure();

        await expect(OpenFeature.setContext({ username: "admin" })).resolves.toBeUndefined();

        expect(OpenFeature.getClient().providerStatus).toBe(ProviderStatus.ERROR);
        expect(OpenFeature.getClient().getBooleanDetails("feature-a", false).errorCode).toBe(ErrorCode.PROVIDER_NOT_READY);
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

        expect(OpenFeature.getClient().getBooleanDetails("feature-a", false).errorCode).toBe(ErrorCode.PROVIDER_NOT_READY);
    });
});

describe("A context change while initialization is still fetching", () => {
    let finishFetch: (outcome: { evaluator?: FeatureFlagEvaluator; error?: Error }) => void;

    const buildProvider = () =>
        new OctopusFeatureProvider({
            clientIdentifier: "test",
            productMetadata: new ProductMetadata("TestClient"),
            logger: silentLogger(),
        });

    beforeEach(async () => {
        await OpenFeature.setContext({});
        jest.mocked(FeatureFlagApiClient).mockClear();
        jest.mocked(FeatureFlagApiClient).prototype.getEvaluator = jest.fn().mockImplementation(
            () =>
                new Promise<FeatureFlagEvaluator>((resolve, reject) => {
                    finishFetch = ({ evaluator, error }) => (evaluator ? resolve(evaluator) : reject(error));
                })
        );
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
    });

    test("Ends READY once the fetch succeeds", async () => {
        const initialized = OpenFeature.setProviderAndWait(buildProvider());
        const contextChanged = OpenFeature.setContext({ username: "admin" });

        finishFetch({ evaluator: new FeatureFlagEvaluator({ evaluations: [], contentHash: "hash" }, silentLogger()) });
        await initialized;
        await contextChanged;

        expect(OpenFeature.getClient().providerStatus).toBe(ProviderStatus.READY);
    });

    // Judging the context change before the fetch settles would briefly move the provider to ERROR, and announce an
    // outage on a start that succeeded.
    test("Emits no PROVIDER_ERROR on the way when the fetch succeeds", async () => {
        const onError = jest.fn();
        OpenFeature.addHandler(ProviderEvents.Error, onError);

        try {
            const initialized = OpenFeature.setProviderAndWait(buildProvider());
            const contextChanged = OpenFeature.setContext({ username: "admin" });

            finishFetch({ evaluator: new FeatureFlagEvaluator({ evaluations: [], contentHash: "hash" }, silentLogger()) });
            await initialized;
            await contextChanged;

            expect(onError).not.toHaveBeenCalled();
        } finally {
            OpenFeature.removeHandler(ProviderEvents.Error, onError);
        }
    });

    test("Ends ERROR once the fetch fails", async () => {
        const initialized = OpenFeature.setProviderAndWait(buildProvider());
        const contextChanged = OpenFeature.setContext({ username: "admin" });

        finishFetch({ error: new ProviderNotReadyError("unavailable") });
        await expect(initialized).rejects.toBeDefined();
        await contextChanged;

        expect(OpenFeature.getClient().providerStatus).toBe(ProviderStatus.ERROR);
    });
});

describe("A provider served from the cache", () => {
    beforeEach(async () => {
        await OpenFeature.setContext({});
        jest.mocked(FeatureFlagApiClient).mockClear();
        jest.mocked(FeatureFlagApiClient).prototype.getEvaluator = jest.fn().mockResolvedValue(
            new FeatureFlagEvaluator(
                {
                    evaluations: [new ServerSideEvaluation("cached-feature", true, "The flag is enabled for this environment.")],
                    contentHash: "cached-hash",
                },
                silentLogger()
            )
        );
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
    });

    test("Becomes ready and evaluates the cached flags", async () => {
        const provider = new OctopusFeatureProvider({
            clientIdentifier: "test",
            productMetadata: new ProductMetadata("TestClient"),
        });

        await OpenFeature.setProviderAndWait(provider);

        expect(OpenFeature.getClient().providerStatus).toBe(ProviderStatus.READY);
        expect(OpenFeature.getClient().getBooleanValue("cached-feature", false)).toBe(true);
    });
});

// The X-Octopus-Client header is how backend telemetry tells web traffic apart from other providers.
test("Identifies itself to the API client as the web provider", () => {
    new OctopusFeatureProvider({ clientIdentifier: "test", productMetadata: new ProductMetadata("TestClient") });

    expect(FeatureFlagApiClient).toHaveBeenCalledWith(
        expect.objectContaining({ provider: { name: "openfeature-provider-ts-web", version: PROVIDER_VERSION } })
    );
});
