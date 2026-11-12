import { ServerSideEvaluation } from "../v4/serverSideEvaluation.js";

/**
 * Parsed response from the evaluations endpoint.
 *
 * @internal
 */
export interface EvaluationResponse {
    readonly evaluations: readonly ServerSideEvaluation[];
    readonly contentHash: string;
}

/**
 * Unparsed, exactly as received from the v4 endpoint.
 *
 * @internal
 */
export interface RawEvaluationResponse {
    evaluations: unknown;
    contentHash: string;
}
