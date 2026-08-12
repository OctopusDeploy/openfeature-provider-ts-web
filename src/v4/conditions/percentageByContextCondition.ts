import { ParseError } from "@openfeature/web-sdk";
import { ClientSideEvaluationContext } from "../clientSideEvaluationContext";
import { includes } from "../percentageRollout";
import { ClientSideCondition } from "./clientSideCondition";

/**
 * Matches when the OpenFeature targeting key falls within the `percentage`% rollout.
 *
 * @internal
 */
export class PercentageByContextCondition extends ClientSideCondition {
    /**
     * @param percentage The rollout percentage, 0–100. Optional so an absent `percentage` stays
     * distinguishable from an explicit 0, which is a legitimate "nobody".
     */
    constructor(readonly percentage?: number) {
        super();
    }

    matches(context: ClientSideEvaluationContext): boolean {
        const percentage = this.percentage;

        if (percentage === undefined) {
            throw new ParseError("A condition is missing a percentage value.");
        }

        // Rejected rather than clamped: reading 101 as "everyone" would turn a flag on off the back of
        // a bad payload.
        if (percentage < 0 || percentage > 100) {
            throw new ParseError(`A condition has a percentage of ${percentage}.`);
        }

        const targetingKey = context.openFeatureContext?.targetingKey;

        // Nothing to bucket, so only a full rollout matches — as the server treats an untenanted caller.
        // Falsy rather than a check against undefined and "": the declared type rules out null, but an
        // untyped JavaScript caller can still supply one, and hashing it would bucket on "null".
        if (!targetingKey) {
            return percentage >= 100;
        }

        return includes(context.evaluationKey, targetingKey, percentage);
    }
}
