# Octopus Deploy OpenFeature Provider for TypeScript/JavaScript (web clients)

[![CI build](https://github.com/OctopusDeploy/openfeature-provider-ts-web/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/OctopusDeploy/openfeature-provider-ts-web/actions/workflows/main.yml?query=branch:main)

The OctopusDeploy TypeScript/JavaScript [OpenFeature provider
](https://openfeature.dev/docs/reference/concepts/provider/) for web clients, to be used with the [OpenFeature web SDK](https://openfeature.dev/docs/reference/technologies/client/web/).

## About Octopus Deploy

[Octopus Deploy](https://octopus.com) is a sophisticated, best-of-breed continuous delivery (CD) platform for modern software teams. Octopus offers powerful release orchestration, deployment automation, and runbook automation, while handling the scale, complexity and governance expectations of even the largest organizations with the most complex deployment challenges.

## Getting Started

### Installation

```
npm i @octopusdeploy/openfeature @openfeature/web-sdk @openfeature/core
```

`@openfeature/web-sdk` and `@openfeature/core` are peer dependencies, so your app and the provider share a single copy of the OpenFeature SDK. npm 7+ and pnpm 8+ install them automatically, but Yarn 1 does not, so list them in your own `package.json`.

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
