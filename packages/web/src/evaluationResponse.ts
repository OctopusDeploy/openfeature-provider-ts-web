import { ServerSideEvaluation } from "@octopusdeploy/openfeature-core";

/**
 * Parsed response from the evaluations endpoint.
 *
 * @internal
 */
export interface EvaluationResponse {
    readonly evaluations: readonly ServerSideEvaluation[];
    readonly contentHash: string;
}
