import { ClientSideCondition } from "./clientSideCondition";

/**
 * Matches when the context attribute `key` is one of `values`.
 *
 * @internal
 */
export class ContextAttributeIsOneOfCondition extends ClientSideCondition {
    constructor(
        readonly key: string,
        readonly values: readonly string[]
    ) {
        super();
    }
}
