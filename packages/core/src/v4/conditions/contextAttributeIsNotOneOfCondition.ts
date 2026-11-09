import { ClientSideEvaluationContext } from "../clientSideEvaluationContext.js";
import { ClientSideCondition } from "./clientSideCondition.js";
import { isOneOf } from "./contextAttributes.js";

/**
 * Matches when the context attribute `key` is not one of `values`. Keys and values compare case-insensitively. A
 * missing attribute matches.
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

    matches(context: ClientSideEvaluationContext): boolean {
        return !isOneOf(context, this.key, this.values);
    }
}
