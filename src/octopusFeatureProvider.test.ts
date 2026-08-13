import { OctopusFeatureProvider } from "./octopusFeatureProvider";
import { ProductMetadata } from "./productMetadata";
import { OpenFeature } from "@openfeature/web-sdk";
import { ErrorCode } from "@openfeature/core";
import { OctopusFeatureClient } from "./octopusFeatureClient";
import { OctopusFeatureContext } from "./octopusFeatureContext";
import { silentLogger } from "./testing/logger";
import { ClientSideRule } from "./v4/clientSideRule";
import { ContextAttributeIsOneOfCondition } from "./v4/conditions/contextAttributeIsOneOfCondition";
import { ServerSideEvaluation } from "./v4/serverSideEvaluation";

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
        jest.mocked(OctopusFeatureClient).prototype.getEvaluationContext = jest
            .fn()
            .mockResolvedValue(
                new OctopusFeatureContext(
                    [
                        new ServerSideEvaluation("segmented-feature", undefined, undefined, "evaluation-key", [
                            new ClientSideRule("Client-side targeting", [new ContextAttributeIsOneOfCondition("serverUri", ["app.example.com"])]),
                        ]),
                    ],
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
        jest.mocked(OctopusFeatureClient).mockClear();
        jest.mocked(OctopusFeatureClient).prototype.getEvaluationContext = jest
            .fn()
            .mockResolvedValue(
                new OctopusFeatureContext([new ServerSideEvaluation("feature-a", true, "The flag is enabled for this environment.")], silentLogger())
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
        jest.mocked(OctopusFeatureClient).mockClear();
        jest.mocked(OctopusFeatureClient).prototype.getEvaluationContext = jest
            .fn()
            .mockResolvedValue(new OctopusFeatureContext([new ServerSideEvaluation("feature-a", true)], silentLogger())); // value with no reason: malformed
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
