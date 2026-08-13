import { ServerSideEvaluation } from "./v4/serverSideEvaluation";

/**
 * One parsed response from the evaluations endpoint.
 *
 * @internal
 */
export interface EvaluationResponse {
    readonly evaluations: readonly ServerSideEvaluation[];
    readonly contentHash: string;
}
