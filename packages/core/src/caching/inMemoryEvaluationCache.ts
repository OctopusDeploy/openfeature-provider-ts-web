import { EvaluationCache, RawEvaluationResponse } from "./evaluationCache.js";

/**
 * Keeps the last evaluations fetched for as long as this instance lives, for providers that have no storage that
 * outlives the process. Neither method can fail, so both meet the EvaluationCache contract trivially.
 *
 * @internal
 */
export class InMemoryEvaluationCache implements EvaluationCache {
    private entry: RawEvaluationResponse | undefined;

    read(): RawEvaluationResponse | undefined {
        return this.entry;
    }

    write(raw: RawEvaluationResponse): void {
        this.entry = raw;
    }
}
