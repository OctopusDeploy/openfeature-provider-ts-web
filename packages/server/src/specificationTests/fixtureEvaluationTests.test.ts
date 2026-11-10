import { OpenFeature } from "@openfeature/server-sdk";
import { runSpecificationFixtures } from "specification-tests";
import { OctopusFeatureProvider } from "../octopusFeatureProvider.js";
import { ProductMetadata } from "@octopusdeploy/openfeature-core";

// The server SDK uses dynamic context: it travels with each evaluation instead of being set globally.
// Each setProviderAndWait closes the provider it replaces; this closes the last one, so no polling timer outlives the run.
afterAll(async () => {
    await OpenFeature.close();
});

runSpecificationFixtures(async ({ serverUri, clientIdentifier, slug, defaultValue, context }) => {
    const provider = new OctopusFeatureProvider({
        clientIdentifier,
        serverUri,
        productMetadata: new ProductMetadata("TestClient"),
    });

    await OpenFeature.setProviderAndWait(provider);

    return OpenFeature.getClient().getBooleanDetails(slug, defaultValue, context);
});
