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
        // Declared non-optional, but nothing enforces that on a parsed payload — hence the wider local
        // types. The server only defers a named rule carrying at least one condition, so anything else
        // is a response it could not have sent.
        const name: string | undefined = this.name;

        if (name === undefined) {
            throw new ParseError("A rule has no name.");
        }

        const conditions: readonly (ClientSideCondition | undefined)[] | undefined = this.conditions;

        if (conditions === undefined || conditions.length === 0) {
            throw new ParseError(`Rule '${name}' has no conditions.`);
        }

        for (const condition of conditions) {
            if (condition === undefined) {
                throw new ParseError(`Rule '${name}' has a missing condition.`);
            }

            if (!condition.matches(context)) {
                return false;
            }
        }

        return true;
    }
}
