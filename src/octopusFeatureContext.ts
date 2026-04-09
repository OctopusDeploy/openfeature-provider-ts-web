import { EvaluationContext, ResolutionDetails } from "@openfeature/web-sdk";
import { ErrorCode } from "@openfeature/core";
import murmur from "murmurhash3js-revisited";

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
    toggles: V2FeatureToggles;

    constructor(toggles: V2FeatureToggles) {
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

        if (missingRequiredPropertiesForClientSideEvaluation(evaluation)) {
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

    evaluateSegments(evaluation: V2FeatureToggleEvaluation, context: EvaluationContext): boolean {
        if (!evaluation.isEnabled) {
            return false;
        }

        // evaluationKey and clientRolloutPercentage are guaranteed to be present here via missingRequiredPropertiesForClientSideEvaluation check
        const evaluationKey = evaluation.evaluationKey!;
        const rolloutPercentage = evaluation.clientRolloutPercentage!;
        const targetingKey = context?.targetingKey;

        if (!targetingKey) {
            if (rolloutPercentage < 100) {
                return false;
            }
            // rolloutPercentage == 100: fall through to segment check
        } else {
            if (getNormalizedNumber(evaluationKey, targetingKey) > rolloutPercentage) {
                return false;
            }
        }

        const hasSegments = evaluation.segments != null && evaluation.segments.length > 0;
        return !hasSegments || this.matchesSegment(context, evaluation.segments!);
    }
}

export function getNormalizedNumber(evaluationKey: string, targetingKey: string): number {
    const bytes = new TextEncoder().encode(`${evaluationKey}:${targetingKey}`);

    // MurmurHash3 32-bit, seed 0. x86.hash32 processes tail bytes in little-endian order,
    // matching the reference C spec and equivalent to .NET's MurmurHash.Create32() +
    // BinaryPrimitives.ReadUInt32LittleEndian().
    const hash = murmur.x86.hash32(bytes, 0);

    // JavaScript's >>> 0 reinterprets the signed int as an unsigned 32-bit value —
    // equivalent to Integer.toUnsignedLong() in Java or casting to uint in C#.
    const unsignedHash = hash >>> 0;

    return (unsignedHash % 100) + 1;
}

function missingRequiredPropertiesForClientSideEvaluation(evaluation: V2FeatureToggleEvaluation): boolean {
    if (!evaluation.isEnabled) {
        return false;
    }
    return evaluation.evaluationKey == null || evaluation.segments == null || evaluation.clientRolloutPercentage == null;
}
