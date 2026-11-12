# Octopus Deploy OpenFeature Provider for Node

**Not yet released.** This package is under development and is not published to npm.

The Octopus Deploy TypeScript/JavaScript [OpenFeature provider](https://openfeature.dev/docs/reference/concepts/provider/) for Node, to be used with the [OpenFeature server SDK](https://openfeature.dev/docs/reference/technologies/server/javascript/).

For browsers, use [`@octopusdeploy/openfeature`](https://www.npmjs.com/package/@octopusdeploy/openfeature) instead.

## Usage

```ts
import { OctopusFeatureProvider, ProductMetadata } from "@octopusdeploy/openfeature-server";
import { OpenFeature } from "@openfeature/server-sdk";

const provider = new OctopusFeatureProvider({
    clientIdentifier: "YourClientIdentifier",
    productMetadata: new ProductMetadata("YourProductName", "1.0.0"),
});

await OpenFeature.setProviderAndWait(provider);

const client = OpenFeature.getClient();

// Evaluation context is passed with each evaluation, so one provider serves every request.
if (await client.getBooleanValue("to-the-moon-feature", false, { userid: "bob@octopus.com" })) {
    console.log("🚀🚀🚀");
}
```

The provider fetches flags once, when it initializes. If it cannot retrieve them, `setProviderAndWait` rejects and every evaluation returns your default value.
