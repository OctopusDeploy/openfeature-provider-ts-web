# Octopus Deploy OpenFeature Provider for Node

**Beta.** This package is published under the `beta` dist-tag while its API settles, so install it with `@beta`.

The Octopus Deploy TypeScript/JavaScript [OpenFeature provider](https://openfeature.dev/docs/reference/concepts/provider/) for Node, to be used with the [OpenFeature server SDK](https://openfeature.dev/docs/reference/technologies/server/javascript/).

For browsers, use [`@octopusdeploy/openfeature`](https://www.npmjs.com/package/@octopusdeploy/openfeature) instead.

## Installation

```
npm i @octopusdeploy/openfeature-server@beta @openfeature/server-sdk
```

`@openfeature/server-sdk` is a peer dependency, so your app and the provider share a single copy of the OpenFeature SDK. npm 7+ and pnpm 8+ install it automatically. Yarn does not, so list `@openfeature/server-sdk` and its own peer dependency `@openfeature/core` in your `package.json`.

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

The provider fetches flags when it initializes. If it cannot retrieve them, `setProviderAndWait` rejects and every evaluation returns your default value.

After that, it checks for changes every minute and fetches the flags again only when they have changed. Set `cacheDurationMs` to check more or less often. If a check fails, the provider keeps evaluating against the flags it already has and tries again at the next interval. If initialization failed, it keeps trying and moves to `READY` once the flags can be fetched.

Polling stops when the provider is closed, for example by `OpenFeature.close()`. The polling timer never keeps the Node process alive on its own.
