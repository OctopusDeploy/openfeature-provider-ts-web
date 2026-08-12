import { EvaluationContext, EvaluationContextValue } from "@openfeature/web-sdk";
import { ClientSideEvaluationContext } from "../v4/clientSideEvaluationContext";

// Builds the contexts the v4 evaluation tests run against.
//
// getNormalizedNumber("evaluation-key", "targeting-key") is 13, so this targeting key is inside a
// >=13% rollout and outside a <13% one. The rollout tests either side of the bucket pin that value.
export const EvaluationKey = "evaluation-key";
export const TargetingKey = "targeting-key";
export const TargetingKeyBucket = 13;

/** An OpenFeature context with the given targeting key and attributes. */
export function openFeature(targetingKey?: string, attributes?: Record<string, EvaluationContextValue>): EvaluationContext {
    const context: EvaluationContext = { ...attributes };

    if (targetingKey !== undefined) {
        context.targetingKey = targetingKey;
    }

    return context;
}

/** What a rule or condition is evaluated against. */
export function forRules(targetingKey?: string, attributes?: Record<string, EvaluationContextValue>): ClientSideEvaluationContext {
    return { evaluationKey: EvaluationKey, openFeatureContext: openFeature(targetingKey, attributes) };
}

/** A rule context whose caller supplied no context at all. */
export function withoutOpenFeatureContext(): ClientSideEvaluationContext {
    return { evaluationKey: EvaluationKey, openFeatureContext: undefined };
}
