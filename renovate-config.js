module.exports = {
  platform: "github",
  timezone: "Australia/Brisbane",
  requireConfig: "optional",
  onboarding: false,

  repositories: ["OctopusDeploy/openfeature-provider-ts-web"],
  reviewers: ["team:team-devex"],
  branchPrefix: "renovate/",
  labels: ["dependencies"],
  prConcurrentLimit: 5,

  // Raise PRs for known vulnerabilities (replaces Dependabot security alerts).
  osvVulnerabilityAlerts: true,
  minimumReleaseAge: "2 days",

  // Match the conventional-commit style used by release-please in this repo.
  // Runtime dependencies default to `fix` so they trigger a patch release.
  semanticCommits: "enabled",
  semanticCommitType: "fix",
  semanticCommitScope: "deps",

  globalExtends: [
    "config:recommended",
    "helpers:pinGitHubActionDigests", // Pin all GitHub Actions to a commit SHA.
  ],

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
      // pin/pinDigest/digest updates have no release timestamp, so
      // minimumReleaseAge can never be satisfied and its stability check
      // would leave those PRs pending forever.
      // https://github.com/renovatebot/renovate/issues/40288
      matchUpdateTypes: ['pin', 'pinDigest', 'digest'],
      minimumReleaseAge: null,
      prBodyNotes: [
        '**Manual supply-chain check:** `minimumReleaseAge` cannot be enforced for pin/digest updates because they have no release timestamp. Before merging, confirm this commit SHA has been published for at least **2 days**.',
      ],
    },
  ],
};
