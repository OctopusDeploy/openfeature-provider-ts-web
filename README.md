# Octopus Deploy OpenFeature Provider for TypeScript/JavaScript (web clients)

[![Build test and release](https://github.com/OctopusDeploy/openfeature-provider-ts-web/actions/workflows/build-test-release.yml/badge.svg)](https://github.com/OctopusDeploy/openfeature-provider-ts-web/actions/workflows/build-test-release.yml)

The OctopusDeploy TypeScript/JavaScript [OpenFeature provider
](https://openfeature.dev/docs/reference/concepts/provider/) for web clients, to be used with the [OpenFeature web SDK](https://openfeature.dev/docs/reference/technologies/client/web/).

## About Octopus Deploy

[Octopus Deploy](https://octopus.com) is a sophisticated, best-of-breed continuous delivery (CD) platform for modern software teams. Octopus offers powerful release orchestration, deployment automation, and runbook automation, while handling the scale, complexity and governance expectations of even the largest organizations with the most complex deployment challenges.

## Getting Started

### Installation

```
npm i @octopusdeploy/openfeature
```

### Usage

```ts
import { OctopusFeatureProvider, ProductMetadata } from "@octopusdeploy/openfeature";
import { OpenFeature } from "@openfeature/web-sdk";

const provider = new OctopusFeatureProvider({
  clientIdentifier: "YourClientIdentifier",
  productMetadata: new ProductMetadata("YourProductName", "1.0.0"),
});

await OpenFeature.setContext({ userid: "bob@octopus.com" });
await OpenFeature.setProviderAndWait(provider);

const client = OpenFeature.getClient();

if (client.getBooleanValue("to-the-moon-feature", false, {})) {
  console.log("🚀🚀🚀");
}
```

### When feature flags are unavailable

If the provider cannot retrieve feature flags and has no cached evaluations to fall back on, initialization fails: `setProviderAndWait` rejects, the provider moves to `ERROR` and emits `PROVIDER_ERROR`, and every evaluation returns your default value with the `PROVIDER_NOT_READY` error code. A provider started from cached evaluations becomes `READY` as normal.

To keep the rest of your application running when feature flags are unavailable, catch the rejection:

```ts
try {
  await OpenFeature.setProviderAndWait(provider);
} catch (e) {
  console.warn("Feature flags are unavailable, falling back to default values.", e);
}
```
