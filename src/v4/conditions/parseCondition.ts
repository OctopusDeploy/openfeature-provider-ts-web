import { asArray, asInteger, asRecord, asString } from "../jsonUtils";
import { ClientSideCondition } from "./clientSideCondition";
import { ConditionTypeNames } from "./conditionTypeNames";
import { ContextAttributeIsNotOneOfCondition } from "./contextAttributeIsNotOneOfCondition";
import { ContextAttributeIsOneOfCondition } from "./contextAttributeIsOneOfCondition";
import { PercentageByContextCondition } from "./percentageByContextCondition";
import { UnknownCondition } from "./unknownCondition";

/**
 * Selects the concrete {@link ClientSideCondition} from the camelCase `type` discriminator. An
 * unrecognised or absent discriminator produces an {@link UnknownCondition} rather than throwing, so
 * a condition type introduced by a newer server degrades safely on an older client.
 *
 * @internal
 */
export function parseCondition(raw: unknown): ClientSideCondition | undefined {
    const condition = asRecord(raw);

    if (condition === undefined) {
        return undefined;
    }

    const type = asString(condition.type);

    switch (type) {
        case ConditionTypeNames.percentageByContext:
            return new PercentageByContextCondition(asInteger(condition.percentage));
        case ConditionTypeNames.contextAttributeIsOneOf:
            return new ContextAttributeIsOneOfCondition(asString(condition.key)!, parseValues(condition.values));
        case ConditionTypeNames.contextAttributeIsNotOneOf:
            return new ContextAttributeIsNotOneOfCondition(asString(condition.key)!, parseValues(condition.values));
        default:
            return new UnknownCondition(type);
    }
}

function parseValues(raw: unknown): readonly string[] {
    const values = asArray(raw)?.map((value) => asString(value)!);
    return values as readonly string[];
}
