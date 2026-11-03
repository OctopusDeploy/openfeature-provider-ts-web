import { ClientSideRule } from "./clientSideRule.js";
import { ClientSideCondition } from "./conditions/clientSideCondition.js";
import { parseCondition } from "./conditions/parseCondition.js";
import { asArray, asRecord, asString } from "./jsonUtils.js";

/**
 * Reads a client-side rule and its polymorphic conditions.
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

function parseConditions(raw: unknown): readonly ClientSideCondition[] {
    const conditions = asArray(raw)?.map((condition) => parseCondition(condition)!);
    return conditions as readonly ClientSideCondition[];
}
