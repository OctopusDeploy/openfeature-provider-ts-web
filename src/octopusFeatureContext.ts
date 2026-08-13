import { EvaluationContext, Logger, ResolutionDetails } from "@openfeature/web-sdk";
import { FlagNotFoundError } from "@openfeature/core";
import { equalsIgnoringCase } from "./equalsIgnoringCase";
import { ServerSideEvaluation } from "./v4/serverSideEvaluation";

// Superseded by ServerSideEvaluation below. Left in place, unreferenced, for BMBB-781 to remove along
// with the rest of the v3 "toggle" vocabulary.
export interface V2FeatureToggles {
    evaluations: V2FeatureToggleEvaluation[];
    contentHash: string;
}

export interface V2FeatureToggleEvaluation {
    slug: string;
    isEnabled: boolean;
    evaluationKey?: string;
    segments?: { key: string; value: string }[];
    clientRolloutPercentage?: number;
}

export class OctopusFeatureContext {
    // Slugs already warned about, folded the same way as the lookup below, so a typo'd slug re-rendered
    // thousands of times costs one console line rather than thousands.
    private readonly warnedSlugs = new Set<string>();

    constructor(
        private readonly evaluations: readonly ServerSideEvaluation[],
        private readonly logger: Logger
    ) {}

    findToggleBySlug(slug: string): ServerSideEvaluation | undefined {
        return this.evaluations.find((evaluation) => typeof evaluation.slug === "string" && equalsIgnoringCase(evaluation.slug, slug));
    }

    evaluate(slug: string, context: EvaluationContext): ResolutionDetails<boolean> {
        const evaluation = this.findToggleBySlug(slug);

        if (!evaluation) {
            this.warnUnrecognisedSlugOnce(slug);
            throw new FlagNotFoundError("The slug provided did not match any of your Octopus Feature Flags. Please double check your slug and try again.");
        }

        return evaluation.evaluate(context);
    }

    private warnUnrecognisedSlugOnce(slug: string): void {
        const key = slug.toUpperCase();
        if (this.warnedSlugs.has(key)) {
            return;
        }

        this.warnedSlugs.add(key);
        this.logger.warn(`The slug '${slug}' did not match any of your Octopus Feature Flags. This will only be logged once per slug.`);
    }
}
