import { ClientSideCondition } from "./clientSideCondition";

/**
 * Matches when the context attribute `key` is not one of `values`.
 *
 * @internal
 */
export class ContextAttributeIsNotOneOfCondition extends ClientSideCondition {
    // Declared non-optional, but nothing enforces that on a deserialised payload — evaluation
    // validates before reading either.
    constructor(
        readonly key: string,
        readonly values: readonly string[]
    ) {
        super();
    }
}
