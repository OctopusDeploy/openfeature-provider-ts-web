import { ParseError } from "@openfeature/web-sdk";
import { ClientSideEvaluationContext } from "./clientSideEvaluationContext";
import { ClientSideCondition } from "./conditions/clientSideCondition";

/**
 * A named rule the provider library still has to evaluate on the client side. The rule matches when
 * every one of its conditions matches.
 *
 * @internal
 */
export class ClientSideRule {
    constructor(
        readonly name: string,
        readonly conditions: readonly ClientSideCondition[]
    ) {}

    matches(context: ClientSideEvaluationContext): boolean {
        if (this.name === undefined) {
            throw new ParseError("A rule has no name.");
        }

        if (this.conditions === undefined || this.conditions.length === 0) {
            throw new ParseError(`Rule '${this.name}' has no conditions.`);
        }

        for (const condition of this.conditions) {
            if (condition === undefined) {
                throw new ParseError(`Rule '${this.name}' has a missing condition.`);
            }

            if (!condition.matches(context)) {
                return false;
            }
        }

        return true;
    }
}
