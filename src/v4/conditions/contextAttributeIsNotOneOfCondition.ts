import { ClientSideCondition } from "./clientSideCondition";

/**
 * Matches when the context attribute `key` is not one of `values`.
 *
 * @internal
 */
export class ContextAttributeIsNotOneOfCondition extends ClientSideCondition {
    constructor(
        readonly key: string,
        readonly values: readonly string[]
    ) {
        super();
    }
}
