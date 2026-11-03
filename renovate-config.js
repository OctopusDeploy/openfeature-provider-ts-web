module.exports = {
  extends: ["github>OctopusDeploy/team-bmbb-renovate-config:default.json5"],

  // Match the conventional-commit style used by release-please in this repo.
  // Runtime dependencies default to `fix` so they trigger a patch release.
  semanticCommits: "enabled",
  semanticCommitType: "fix",
  semanticCommitScope: "deps",

  enabledManagers: ["npm", "github-actions"],

  packageRules: [
    {
      // OpenFeature SDK updates are worth releasing as a minor version, even if not breaking
      matchPackageNames: ["@openfeature/web-sdk"],
      matchUpdateTypes: ["minor", "patch"],
      semanticCommitType: "feat",
    },
    {
      // Dev-time dependencies don't ship in the published package.
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
  ],
};
