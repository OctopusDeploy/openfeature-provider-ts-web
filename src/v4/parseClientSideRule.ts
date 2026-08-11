import { ClientSideRule } from "./clientSideRule";
import { ClientSideCondition } from "./conditions/clientSideCondition";
import { parseCondition } from "./conditions/parseCondition";
import { asArray, asRecord, asString } from "./jsonUtils";

/**
 * Reads a client-side rule and its polymorphic conditions.
 *
 * Returns undefined when the rule is not an object at all, which no server version sends: the flag
 * reports it as a missing rule when it is evaluated.
 *
 * @internal
 */
export function parseClientSideRule(raw: unknown): ClientSideRule | undefined {
    const rule = asRecord(raw);

    if (rule === undefined) {
        return undefined;
    }

    return new ClientSideRule(asString(rule.name)!, parseConditions(rule.conditions));
}

// An absent `conditions`, or an element that is not a condition, is asserted away to match how the
// other libraries declare the property. Evaluation validates both before reading it.
function parseConditions(raw: unknown): readonly ClientSideCondition[] {
    const conditions = asArray(raw)?.map((condition) => parseCondition(condition)!);
    return conditions as readonly ClientSideCondition[];
}
