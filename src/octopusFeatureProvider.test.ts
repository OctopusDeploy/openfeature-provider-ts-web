import { OctopusFeatureProvider } from "./octopusFeatureProvider";
import { OpenFeature } from "@openfeature/web-sdk";

describe("octopusFeatureProvider", () => {
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
