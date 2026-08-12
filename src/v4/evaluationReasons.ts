// Reasons returned alongside a client-side evaluation. Both match the strings the Feature Flags
// service produces server-side, so a flag reads the same whichever side resolved it.

/** @internal */
export function matchedRule(ruleName: string): string {
    return `Matched rule '${ruleName}'.`;
}

/** @internal */
export function didNotMatchAnyRules(): string {
    return "Did not match any rules.";
}
