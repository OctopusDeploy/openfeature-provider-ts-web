/**
 * Case-insensitive string equality.
 *
 * Stands in for .NET's OrdinalIgnoreCase, which folds with invariant uppercase. The two agree on every
 * ASCII input; they part on JavaScript's full case mappings, where "ß" uppercases to "SS".
 *
 * @internal
 */
export function equalsIgnoringCase(left: string, right: string): boolean {
    return left.toUpperCase() === right.toUpperCase();
}
