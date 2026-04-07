import { EvaluationContext, ResolutionDetails } from "@openfeature/web-sdk";
import { ErrorCode } from "@openfeature/core";

export interface V1FeatureToggles {
    evaluations: V1FeatureToggleEvaluation[];
    contentHash: string;
}

export interface V1FeatureToggleEvaluation {
    slug: string;
    isEnabled: boolean;
    evaluationKey?: string;
    segments?: { key: string; value: string }[];
    clientRolloutPercentage?: number;
}

export class OctopusFeatureContext {
    toggles: V1FeatureToggles;

    constructor(toggles: V1FeatureToggles) {
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

        if (missingRequiredFieldsForClientEvaluation(evaluation)) {
            return {
                value: defaultValue,
                errorCode: ErrorCode.PARSE_ERROR,
                errorMessage: `Feature toggle ${slug} is missing necessary information for client-side evaluation.`,
            };
        }

        return { value: this.evaluateSegments(evaluation, context) };
    }

    matchesSegment(context: EvaluationContext, segments: { key: string; value: string }[]): boolean {
        if (!context) return false;

        // Group segments by key
        const groupedSegments = segments.reduce(
            (groups, segment) => {
                if (!groups[segment.key]) {
                    groups[segment.key] = [];
                }
                groups[segment.key].push(segment.value);
                return groups;
            },
            {} as Record<string, string[]>
        );

        // Check if all segment groups have at least one matching context entry
        const result = Object.keys(groupedSegments).every((segmentKey) => {
            const group = groupedSegments[segmentKey];
            return group.some((segment) =>
                Object.keys(context).some((contextKey) => {
                    const contextValue = context[contextKey];
                    if (typeof contextValue === "string") {
                        return contextKey === segmentKey && contextValue === segment;
                    }
                    return false;
                })
            );
        });

        return result;
    }

    evaluateSegments(evaluation: V1FeatureToggleEvaluation, context: EvaluationContext): boolean {
        const hasSegments = evaluation.segments != null && evaluation.segments.length > 0;
        return evaluation.isEnabled && (!hasSegments || this.matchesSegment(context, evaluation.segments!));
    }
}

function missingRequiredFieldsForClientEvaluation(evaluation: V1FeatureToggleEvaluation): boolean {
    if (!evaluation.isEnabled) {
        return false;
    }
    return evaluation.evaluationKey == null || evaluation.segments == null || evaluation.clientRolloutPercentage == null;
}
