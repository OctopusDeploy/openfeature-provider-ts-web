/**
 * Case-insensitive string equality, shared by slug lookup ({@link OctopusFeatureContext}), condition
 * attribute/value matching ({@link isOneOf}), and the warn-once key for unrecognised slugs — one fold
 * so the three can't quietly disagree with each other.
 *
 * Stands in for .NET's OrdinalIgnoreCase, which folds with invariant uppercase. The two agree on every
 * ASCII input; they part on JavaScript's full case mappings, where "ß" uppercases to "SS".
 *
 * @internal
 */
export function equalsIgnoringCase(left: string, right: string): boolean {
    return left.toUpperCase() === right.toUpperCase();
}
