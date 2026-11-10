import { OpenFeature } from "@openfeature/server-sdk";
import { runSpecificationFixtures } from "specification-tests";
import { OctopusFeatureProvider } from "../octopusFeatureProvider.js";
import { ProductMetadata } from "@octopusdeploy/openfeature-core";

// The server SDK uses dynamic context: it travels with each evaluation instead of being set globally.
runSpecificationFixtures(async ({ serverUri, clientIdentifier, slug, defaultValue, context }) => {
    const provider = new OctopusFeatureProvider({
        clientIdentifier,
        serverUri,
        productMetadata: new ProductMetadata("TestClient"),
    });

    await OpenFeature.setProviderAndWait(provider);

    return OpenFeature.getClient().getBooleanDetails(slug, defaultValue, context);
});
