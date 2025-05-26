# Octopus Deploy OpenFeature Provider for TypeScript/JavaScript (web client) 

[![Build test and release](https://github.com/OctopusDeploy/openfeature-provider-ts-web/actions/workflows/build-test-release.yml/badge.svg)](https://github.com/OctopusDeploy/openfeature-provider-ts-web/actions/workflows/build-test-release.yml)

The OctopusDeploy TypeScript/JavaScript [OpenFeature provider
](https://openfeature.dev/docs/reference/concepts/provider/)

## About Octopus Deploy 

[Octopus Deploy](https://octopus.com) is a sophisticated, best-of-breed continuous delivery (CD) platform for modern software teams. Octopus offers powerful release orchestration, deployment automation, and runbook automation, while handling the scale, complexity and governance expectations of even the largest organizations with the most complex deployment challenges.

## Getting Started

### Installation

```
npm i @octopusdeploy/openfeature
```

### Usage

```ts
const provider = new OctopusFeatureProvider({ clientIdentifier: "YourClientIdentifier" });

await OpenFeature.setProviderAndWait(provider);

await OpenFeature.setContext({ userid: "bob@octopus.com" });

const client = OpenFeature.getClient();
    
if (client.getBooleanValue("to-the-moon-feature", false, {})) {
    console.log('🚀🚀🚀');
}
```
