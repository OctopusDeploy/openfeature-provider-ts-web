import { ClientSideRule } from "./clientSideRule";
import { asArray, asBoolean, asRecord, asString } from "./jsonUtils";
import { parseClientSideRule } from "./parseClientSideRule";
import { ServerSideEvaluation } from "./serverSideEvaluation";

/**
 * Reads the v4 evaluations endpoint's response: an array of flags.
 *
 * A response that is not an array holds no flags rather than failing, and a flag that is not an
 * object is dropped — nothing could look it up, as it has no slug. A flag that is malformed in any
 * other way is kept and reported when it is evaluated, so it costs only itself.
 *
 * @internal
 */
export function parseServerSideEvaluations(raw: unknown): readonly ServerSideEvaluation[] {
    const evaluations = asArray(raw) ?? [];

    return evaluations.map(parseServerSideEvaluation).filter((evaluation): evaluation is ServerSideEvaluation => evaluation !== undefined);
}

/**
 * Reads a single flag, in either of the two shapes the endpoint returns.
 *
 * Returns undefined when the flag is not an object at all.
 *
 * @internal
 */
export function parseServerSideEvaluation(raw: unknown): ServerSideEvaluation | undefined {
    const evaluation = asRecord(raw);

    if (evaluation === undefined) {
        return undefined;
    }

    return new ServerSideEvaluation(
        asString(evaluation.slug)!,
        asBoolean(evaluation.value),
        asString(evaluation.reason),
        asString(evaluation.evaluationKey),
        parseRules(evaluation.rules)
    );
}

// A rule that is not an object is asserted away to match how the other libraries declare the
// property. Evaluation validates each rule before reading it.
function parseRules(raw: unknown): readonly ClientSideRule[] | undefined {
    return asArray(raw)?.map((rule) => parseClientSideRule(rule)!);
}
