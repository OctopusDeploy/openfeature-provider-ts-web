# openfeature-ts-web

[![Build test and release](https://github.com/OctopusDeploy/openfeature-ts/actions/workflows/build-test-release.yml/badge.svg)](https://github.com/OctopusDeploy/openfeature-ts/actions/workflows/build-test-release.yml)

The OctopusDeploy Javascript [OpenFeature Web Provider
](https://openfeature.dev/docs/reference/technologies/client/web/)

# Usage

```ts
const provider = new OctopusFeatureProvider({ clientIdentifier: "YourClientIdentifier" });

await OpenFeature.setProviderAndWait(provider);

await OpenFeature.setContext({ userid: "bob@octopus.com" });

const client = OpenFeature.getClient();
    
if (client.getBooleanValue("to-the-moon-feature", false, {})) {
    console.log('🚀🚀🚀');
}
```

