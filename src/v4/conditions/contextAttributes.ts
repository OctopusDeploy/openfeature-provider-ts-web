import { ParseError } from "@openfeature/web-sdk";
import { ClientSideEvaluationContext } from "../clientSideEvaluationContext";

/**
 * The attribute lookup shared by both attribute conditions.
 *
 * Whether the context holds an attribute named `key` with one of `values`. Keys and values compare
 * case-insensitively and a non-string value counts as absent. Every entry whose key matches is
 * checked, not just the first — a context can hold several case variants of one key.
 *
 * @internal
 */
export function isOneOf(context: ClientSideEvaluationContext, key: string | undefined, values: readonly (string | undefined)[] | undefined): boolean {
    if (key === undefined) {
        throw new ParseError("A condition is missing a key.");
    }

    if (values === undefined || values.length === 0) {
        throw new ParseError("A condition is missing values.");
    }

    if (values.some((value) => value === undefined)) {
        throw new ParseError("A condition is missing a value.");
    }

    const openFeatureContext = context.openFeatureContext;

    // Falsy rather than a check against undefined: the declared type rules out null, but an untyped
    // JavaScript caller can still supply one.
    if (!openFeatureContext) {
        return false;
    }

    return Object.keys(openFeatureContext).some((contextKey) => {
        if (!equalsIgnoringCase(contextKey, key)) {
            return false;
        }

        const attribute = openFeatureContext[contextKey];

        return typeof attribute === "string" && values.some((value) => equalsIgnoringCase(value!, attribute));
    });
}

/**
 * Stands in for .NET's OrdinalIgnoreCase, which folds with invariant uppercase. The two agree on
 * every ASCII input; they part on JavaScript's full case mappings, where "ß" uppercases to "SS" .
 */
function equalsIgnoringCase(left: string, right: string): boolean {
    return left.toUpperCase() === right.toUpperCase();
}
