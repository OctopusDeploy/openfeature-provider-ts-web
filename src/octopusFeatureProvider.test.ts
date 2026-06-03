import { OctopusFeatureProvider } from "./octopusFeatureProvider";
import { ProductMetadata } from "./productMetadata";
import { OpenFeature } from "@openfeature/web-sdk";
import { ErrorCode } from "@openfeature/core";
import { OctopusFeatureClient } from "./octopusFeatureClient";
import { OctopusFeatureContext } from "./octopusFeatureContext";

jest.mock("./octopusFeatureClient");

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
        jest.mocked(OctopusFeatureClient).mockClear();
        jest.mocked(OctopusFeatureClient).prototype.getEvaluationContext = jest.fn().mockResolvedValue(
            new OctopusFeatureContext({
                evaluations: [
                    {
                        slug: "segmented-feature",
                        isEnabled: true,
                        evaluationKey: "evaluation-key",
                        segments: [{ key: "serverUri", value: "app.example.com" }],
                        clientRolloutPercentage: 100,
                    },
                ],
                contentHash: "",
            })
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
        jest.mocked(OctopusFeatureClient).mockClear();
        jest.mocked(OctopusFeatureClient).prototype.getEvaluationContext = jest.fn().mockResolvedValue(
            new OctopusFeatureContext({
                evaluations: [
                    {
                        slug: "feature-a",
                        isEnabled: true,
                        evaluationKey: "key",
                        segments: [],
                        clientRolloutPercentage: 100,
                    },
                ],
                contentHash: "",
            })
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
