module.exports = {
  extends: ["github>OctopusDeploy/team-bmbb-renovate-config:default.json5"],

  // Match the conventional-commit style used by release-please in this repo.
  // Runtime dependencies default to `fix` so they trigger a patch release.
  semanticCommits: "enabled",
  semanticCommitType: "fix",
  semanticCommitScope: "deps",

  enabledManagers: ["npm", "github-actions", "custom.regex"],

  customManagers: [
    {
      // The github-actions manager only reads node-version from an actions/setup-node step. The CI build
      // passes it to the local test action instead, so look it up the same way setup-node would.
      customType: "regex",
      managerFilePatterns: ["/^\\.github/actions/build-test-pack-deploy/action\\.yml$/"],
      matchStrings: ["uses: \\./\\.github/actions/test\\s+with:\\s+node-version: (?<currentValue>\\S+)"],
      depNameTemplate: "node",
      datasourceTemplate: "github-releases",
      packageNameTemplate: "actions/node-versions",
      versioningTemplate: "node",
      extractVersionTemplate: "^(?<version>\\d+\\.\\d+\\.\\d+)(-\\d+)?$",
    },
  ],

  packageRules: [
    {
      // Dev-time dependencies don't ship in the published package. That includes the OpenFeature
      // SDK's devDependencies entry: it's a peer dependency, so a bump only changes what we build and
      // test against.
      matchDepTypes: ["devDependencies"],
      semanticCommitType: "chore",
    },
    {
      // Lint and test tooling only; a green build is enough.
      // TypeScript stays on manual review because it compiles dist/. Both aliases are
      // listed so this holds whether Renovate matches the alias or the real package name.
      matchDepTypes: ["devDependencies"],
      matchPackageNames: ["!typescript", "!@typescript/native", "!@typescript/typescript6"],
      matchUpdateTypes: ["minor", "patch"],
      automerge: true,
    },
    {
      // This workflow tests the oldest Node the server provider supports (engines.node). Bumping it
      // would quietly stop testing that version, so it moves only when engines.node does. Renovate
      // doesn't read the version from the workflow's env today; this keeps it that way if the version
      // ever moves onto a setup-node step.
      matchFileNames: [".github/workflows/minimum-node.yml"],
      matchDepNames: ["node"],
      enabled: false,
    },
  ],
};
