import { EvaluationContext } from "@openfeature/web-sdk";

/**
 * What a flag's rules and conditions are evaluated against.
 *
 * @internal
 */
export interface ClientSideEvaluationContext {
    /** The key `percentage-by-context` buckets against. */
    readonly evaluationKey: string;

    /** The caller's context, or undefined if they supplied none. */
    readonly openFeatureContext: EvaluationContext | undefined;
}
