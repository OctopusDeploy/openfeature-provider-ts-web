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
git clone --recurse-submodules https://github.com/OctopusDeploy/openfeature-provider-ts-web.git
```

If you've already cloned without submodules:

```bash
git submodule update --init
```

## Building and testing

### Prerequisites

- Node.js 24 (the version CI uses)
- npm

### Commands

```bash
npm ci
npm test
npm run build
```

The specification fixtures run as part of `src/specificationTests`.

### Linting and formatting

ESLint runs Prettier as a rule, so a single command checks both. Linting runs on every pull request.

```bash
npm run lint       # check
npm run lint:fix   # fix what can be fixed automatically
```

Don't edit `src/version.ts` by hand. Release Please updates it with each release.

## Making a pull request

1. Fork the repository and create a branch from `main`.
2. Make your change, with tests. New behavior needs new tests, and bug fixes need a test that fails without the fix.
3. Make sure the build, tests, and formatting checks pass locally.
4. Update `README.md` if you've changed public API or configuration.
5. Open a pull request against `main`.

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
