import { EvaluationContext, ResolutionDetails } from "@openfeature/web-sdk";
import { ErrorCode } from "@openfeature/core";

export interface FeatureToggles {
    evaluations: FeatureToggleEvaluation[];
    contentHash: string;
}

export interface FeatureToggleEvaluation {
    name: string;
    slug: string;
    isEnabled: boolean;
    segments: Record<string, string>;
}

export class OctopusFeatureContext {
    toggles: FeatureToggles;

    constructor(toggles: FeatureToggles) {
        this.toggles = toggles;
    }

    evaluate(slug: string, defaultValue: boolean, context: EvaluationContext): ResolutionDetails<boolean> {
        if (!slug.match(/^([a-zA-Z0-9]+(-[a-zA-Z0-9]+)*)$/g)) {
            return {
                value: defaultValue,
                errorCode: ErrorCode.FLAG_NOT_FOUND,
                errorMessage: "Flag key provided was not a slug. Please ensure to provide the slug associated with your Octopus Feature Toggle.",
            };
        }

        const evaluation = this.toggles.evaluations.find((feature) => feature.slug.toLowerCase() === slug.toLowerCase());

        if (!evaluation) {
            return {
                value: defaultValue,
                errorCode: ErrorCode.FLAG_NOT_FOUND,
                errorMessage: "The slug provided did not match any of your Octopus Feature Toggles. Please double check your slug and try again.",
            };
        }

        return { value: this.evaluateSegments(evaluation, context) };
    }

    matchesSegment(context: EvaluationContext, segments: Record<string, string>): boolean {
        if (!context) return false;

        const result = Object.keys(context).some((contextKey) =>
            Object.keys(segments).some((segmentKey) => {
                const contextValue = context[contextKey];
                if (typeof contextValue === "string") {
                    return contextKey === segmentKey && contextValue === segments[segmentKey];
                }
                return false;
            })
        );

        return result;
    }

    evaluateSegments(evaluation: FeatureToggleEvaluation, context: EvaluationContext): boolean {
        const result = evaluation.isEnabled && (Object.keys(evaluation.segments).length === 0 || this.matchesSegment(context, evaluation.segments));
        return result;
    }
}
