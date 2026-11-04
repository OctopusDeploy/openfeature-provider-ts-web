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
      // Dev-time dependencies don't ship in the published package. That includes the OpenFeature
      // SDK's devDependencies entry: it's a peer dependency, so a bump only changes what we build and
      // test against. Raise its peerDependencies range by hand when the code needs a newer SDK.
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
