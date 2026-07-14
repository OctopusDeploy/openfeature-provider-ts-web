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

  // We don't want to pick up third party dependencies the instant they arrive,
  // to give some time for any issues to be discovered, but not wait too long either.
  minimumReleaseAge: "2 days",

  // Match the conventional-commit style used by release-please in this repo.
  semanticCommits: "enabled",
  semanticCommitType: "fix",
  semanticCommitScope: "deps",

  extends: [
    "config:recommended",
    ":automergeMinor",
    "helpers:pinGitHubActionDigests", // Pin all GitHub Actions to a commit SHA.
  ],

  enabledManagers: ["npm", "github-actions"],
};
