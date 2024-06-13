import { OctopusFeatureProvider } from "./octopusFeatureProvider";
import { OpenFeature } from "@openfeature/web-sdk";

// TODO: Set up the needful for this to be a stable integration test that can be run on each build.
describe.skip("octopusFeatureProvider", () => {
    test("use this to verify that the provider is happy end to end", async () => {
        const client = new OctopusFeatureProvider({ clientIdentifier: "TODO" });
        await OpenFeature.setProviderAndWait(client);
        await OpenFeature.setContext({ userid: "abc" });
        const result = OpenFeature.getClient().getBooleanValue("heartbeat", false, {});
        expect(result).toBe(true);
    });
});
