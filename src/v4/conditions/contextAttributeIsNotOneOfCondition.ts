import { ClientSideEvaluationContext } from "../clientSideEvaluationContext";
import { ClientSideCondition } from "./clientSideCondition";
import { isOneOf } from "./contextAttributes";

/**
 * Matches when the context attribute `key` is not one of `values`. A missing attribute matches,
 * mirroring the Feature Flags service's `TenantIsNotOneOf`, where an untenanted caller always
 * matches.
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
