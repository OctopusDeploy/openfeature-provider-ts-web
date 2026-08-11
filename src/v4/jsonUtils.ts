// Reading values out of a parsed v4 evaluation response.
//
// A value of the wrong JSON type reads as absent, so a malformed flag is reported when it is
// evaluated and costs only itself. The .NET and Java providers instead throw while reading the
// response, losing every flag in it — a gap in their deserialisers rather than a decision, tracked
// in BMBB-788.

/** @internal */
export function asString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}

/** @internal */
export function asBoolean(value: unknown): boolean | undefined {
    return typeof value === "boolean" ? value : undefined;
}

/**
 * The wire contract is an integer, so a fractional number reads as absent rather than rolling out to
 * a percentage the server cannot have asked for.
 *
 * @internal
 */
export function asInteger(value: unknown): number | undefined {
    // Math.floor rather than Number.isInteger, which the ES5 target does not have.
    return typeof value === "number" && Math.floor(value) === value ? value : undefined;
}

/** @internal */
export function asArray(value: unknown): readonly unknown[] | undefined {
    return Array.isArray(value) ? value : undefined;
}

/**
 * An array is an object in JSON, but never a rule or a condition, so it reads as absent here too.
 *
 * @internal
 */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
