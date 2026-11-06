import { OpenFeature } from "@openfeature/web-sdk";
import { runSpecificationFixtures } from "specification-tests";
import { OctopusFeatureProvider } from "../octopusFeatureProvider.js";
import { ProductMetadata } from "../productMetadata.js";

// The web SDK uses static context: set it, then evaluate synchronously.
runSpecificationFixtures(async ({ serverUri, clientIdentifier, slug, defaultValue, context }) => {
    const provider = new OctopusFeatureProvider({
        clientIdentifier,
        serverUri,
        productMetadata: new ProductMetadata("TestClient"),
    });

    await OpenFeature.setProviderAndWait(provider);
    await OpenFeature.setContext(context);

    return OpenFeature.getClient().getBooleanDetails(slug, defaultValue);
});
