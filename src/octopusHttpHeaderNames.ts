/**
 * The Octopus-specific headers exchanged with the evaluations endpoint.
 *
 * @internal
 */
export const octopusHttpHeaderNames = {
    releaseVersion: "X-Release-Version",
    octopusClient: "X-Octopus-Client",
    contentHash: "ContentHash",
} as const;
