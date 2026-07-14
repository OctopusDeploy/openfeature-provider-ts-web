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

  extends: [
    "config:recommended",
    "helpers:pinGitHubActionDigests", // Pin all GitHub Actions to a commit SHA.
  ],

  enabledManagers: ["npm", "github-actions"],

  packageRules: [
    {
      // Dev-time dependencies don't ship in the published package.
      matchDepTypes: ["devDependencies"],
      semanticCommitType: "chore",
    },
  ],
};
