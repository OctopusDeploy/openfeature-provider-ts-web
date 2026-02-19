import { OctopusFeatureProvider } from "./octopusFeatureProvider";
import { OpenFeature } from "@openfeature/web-sdk";
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
                        name: "segmented-feature",
                        slug: "segmented-feature",
                        isEnabled: true,
                        segments: [{ key: "serverUri", value: "app.example.com" }],
                    },
                ],
                contentHash: "",
            })
        );
    });

    test("setContext before setProviderAndWait — SDK passes context to initialize", async () => {
        const provider = new OctopusFeatureProvider({ clientIdentifier: "test" });

        await OpenFeature.setContext(context);
        await OpenFeature.setProviderAndWait(provider);

        const result = OpenFeature.getClient().getBooleanValue("segmented-feature", false);
        expect(result).toBe(true);
    });

    test("setProviderAndWait with context — context passed directly to initialize", async () => {
        const provider = new OctopusFeatureProvider({ clientIdentifier: "test" });

        await OpenFeature.setProviderAndWait(provider, context);

        const result = OpenFeature.getClient().getBooleanValue("segmented-feature", false);
        expect(result).toBe(true);
    });

    // This pattern creates a race condition: the provider is READY but context is empty,
    // so any flag evaluation (e.g. from React hooks) between these two calls will fail
    // segment matching. Prefer calling setContext before setProviderAndWait to avoid this.
    test("setProviderAndWait then setContext — context is not available until setContext completes", async () => {
        const provider = new OctopusFeatureProvider({ clientIdentifier: "test" });

        await OpenFeature.setProviderAndWait(provider);

        const resultBeforeContext = OpenFeature.getClient().getBooleanValue("segmented-feature", false);
        expect(resultBeforeContext).toBe(false);

        await OpenFeature.setContext(context);

        const resultAfterContext = OpenFeature.getClient().getBooleanValue("segmented-feature", false);
        expect(resultAfterContext).toBe(true);
    });
});
