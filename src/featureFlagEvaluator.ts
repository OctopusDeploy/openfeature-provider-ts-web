import { EvaluationContext, FlagNotFoundError, Logger, ResolutionDetails } from "@openfeature/web-sdk";
import { EvaluationResponse } from "./evaluationResponse";
import { equalsIgnoringCase } from "./equalsIgnoringCase";
import { ServerSideEvaluation } from "./v4/serverSideEvaluation";

/**
 * Holds one evaluation response and resolves a flag from it, applying any client-side rules the server deferred.
 *
 * @internal
 */
export class FeatureFlagEvaluator {
    private readonly warnedSlugs = new Set<string>();

    constructor(
        private readonly response: EvaluationResponse,
        private readonly logger: Logger
    ) {}

    static empty(logger: Logger): FeatureFlagEvaluator {
        return new FeatureFlagEvaluator({ evaluations: [], contentHash: "" }, logger);
    }

    findEvaluationBySlug(slug: string): ServerSideEvaluation | undefined {
        return this.response.evaluations.find((evaluation) => typeof evaluation.slug === "string" && equalsIgnoringCase(evaluation.slug, slug));
    }

    evaluate(slug: string, context: EvaluationContext): ResolutionDetails<boolean> {
        const evaluation = this.findEvaluationBySlug(slug);

        if (!evaluation) {
            const key = slug.toUpperCase();
            if (!this.warnedSlugs.has(key)) {
                this.logger.warn(`The slug '${slug}' did not match any of your Octopus Feature Flags. Please double check your slug and try again.`);
                this.warnedSlugs.add(key);
            }

            throw new FlagNotFoundError("The slug provided did not match any of your Octopus Feature Flags. Please double check your slug and try again.");
        }

        return evaluation.evaluate(context);
    }
}
