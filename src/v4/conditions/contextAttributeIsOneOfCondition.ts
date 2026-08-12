import { ClientSideEvaluationContext } from "../clientSideEvaluationContext";
import { ClientSideCondition } from "./clientSideCondition";
import { isOneOf } from "./contextAttributes";

/**
 * Matches when the context attribute `key` is one of `values`. Keys and values compare case-insensitively. A missing
 * attribute does not match.
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

    matches(context: ClientSideEvaluationContext): boolean {
        return isOneOf(context, this.key, this.values);
    }
}
