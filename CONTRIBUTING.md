# Contributing

Thanks for your interest in contributing to the Octopus Deploy OpenFeature provider. This guide covers what you need to get a change merged.

## Before you start

- **Bugs and feature requests:** Open a [GitHub issue](../../issues). Include the provider version, your runtime version, and a minimal reproduction if you can.
- **Larger changes:** Open an issue to discuss the change before you start. This saves you from writing code we can't accept.
- **Security vulnerabilities:** Don't open a public issue. Follow our [security policy](https://github.com/OctopusDeploy/.github/blob/main/SECURITY.md) instead.

### Changes to evaluation behavior

Octopus maintains OpenFeature providers for several languages, and they all need to evaluate flags the same way. The expected behavior is defined in the shared [openfeature-provider-specification](https://github.com/OctopusDeploy/openfeature-provider-specification) repository, which is included here as a Git submodule in `specification/`. Every provider runs its fixtures as tests.

If your change affects how flags are evaluated (conditions, rollouts, reasons, or how responses are parsed):

1. Propose the change in the specification repository first.
2. Once it's merged there, update the `specification` submodule in this repository and implement the change.

Bug fixes that bring this provider in line with the existing specification don't need a specification change.

## Getting the code

The tests depend on the specification submodule, so clone with submodules:

```bash
git clone --recurse-submodules https://github.com/OctopusDeploy/openfeature-provider-ts.git
```

If you've already cloned without submodules:

```bash
git submodule update --init
```

## Building and testing

### Prerequisites

- Node.js 26 (the version CI uses)
- npm

The server provider supports the Node versions in its `engines.node`, and the Minimum Node workflow reads the oldest of them from there and runs the same checks on it.

### Commands

The repository is an npm workspace. The web provider lives in `packages/web`, the server provider in `packages/server`, and the code they share in `packages/core`. Run these from the repository root:

```bash
npm ci
npm test
npm run build
npm run lint:package
npm run test:package
```

The specification fixtures (from the `specification` submodule) are run by the private `specification-tests` workspace, which owns case loading, the test server and the assertions. Each provider has a thin test file that tells the harness how its SDK evaluates a flag. Each provider's is at `src/specificationTests/fixtureEvaluationTests.test.ts` in its package.

Each provider's public API is checked by `src/publicApi.test.ts` in its package, using the private `api-surface` workspace. The test fails when the exports change without the committed snapshot in `src/__snapshots__` changing too, and when the public API exposes a type consumers can't import. A type is importable when the provider's entry point exports it or it comes from `@openfeature/*`. A type from core has to be re-exported from the provider's `src/index.ts`. After a deliberate API change, run `npx jest -u` and commit the updated snapshot.

The package ships both ESM and CommonJS builds, so relative imports in `src` must end in `.js` (for example `import { ProductMetadata } from "./productMetadata.js"`). Native Node ESM needs the extension, but `tsc` and the tests don't, so a missing one only shows up when a consumer loads the ESM build. Linting flags it, and `npm run test:package` catches it by packing the package and loading it with both `require()` and `import`.

`npm run lint:package` checks the packed package's `package.json` and type declarations with [publint](https://publint.dev) and [Are the Types Wrong?](https://github.com/arethetypeswrong/arethetypeswrong.github.io). Run it after changing `exports`, the build output, or the `files` list.

### Linting and formatting

ESLint runs Prettier as a rule, so a single command checks both. Linting runs on every pull request.

```bash
npm run lint       # check
npm run lint:fix   # fix what can be fixed automatically
```

Don't edit `packages/web/src/version.ts` by hand. Release Please updates it with each release.

### OpenFeature SDK version

Each provider peer-depends on its OpenFeature SDK: `@openfeature/web-sdk` for web and `@openfeature/server-sdk` for server. The provider runs against whichever version the app installs. The lowest version we support is the bottom of the SDK's `peerDependencies` range in the provider's `package.json`. Day to day we build and test against the newer version in `devDependencies`, and the `test-lowest-sdk` CI job builds and tests against the lowest versions of both SDKs together.

If that job fails, the change needs something from a newer SDK. Raise the `peerDependencies` range to the lowest version that has it.

## Making a pull request

1. Fork the repository and create a branch from `main`.
1. Make your change, with tests. New behavior needs new tests, and bug fixes need a test that fails without the fix.
1. Make sure the build, tests, and formatting checks pass locally.
1. Open a pull request against `main`.

### Pull request titles

We use [Conventional Commits](https://www.conventionalcommits.org/) for **pull request titles**, and a check validates the title on every pull request. Pull requests are squash merged, so the title becomes the commit message on `main`. [Release Please](https://github.com/googleapis/release-please) uses it to decide the next version and write the changelog.

| Title | Effect on the next release |
| --- | --- |
| `fix: handle missing slug in evaluation response` | Patch version bump, listed under Bug Fixes |
| `feat: support custom HTTP timeout` | Minor version bump, listed under Features |
| `feat!: remove deprecated constructor` | Major version bump, listed under Breaking Changes |
| `chore:`, `docs:`, `test:`, `ci:`, `refactor:`, `build:` | No release on its own |

Write the title for someone reading the changelog. It's what users will see.

Don't edit version numbers or `CHANGELOG.md` by hand. Release Please manages both.

### Review

A member of the owning team reviews every pull request (see `CODEOWNERS`). CI builds and tests every pull request, including those from forks. Fork builds don't publish any packages.

## Releases

Maintainers handle releases. If you're curious how it works, see [RELEASING.md](RELEASING.md).

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENSE), the same license that covers this project.
