/**
 * Discriminator values for the polymorphic v4 client-side conditions. These mirror the values in the
 * evaluation response, so they must not drift from the server.
 *
 * @internal
 */
export const ConditionTypeNames = {
    contextAttributeIsNotOneOf: "context-attribute-is-not-one-of",
    contextAttributeIsOneOf: "context-attribute-is-one-of",
    percentageByContext: "percentage-by-context",
} as const;
