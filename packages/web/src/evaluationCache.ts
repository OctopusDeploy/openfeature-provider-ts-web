import type { RawEvaluationResponse } from "@octopusdeploy/openfeature-core";

/**
 * The last evaluations fetched, kept so the provider can still start when the server can't be reached.
 *
 * @internal
 */
export interface EvaluationCache {
    /** Must not throw when the entry can't be read: there is just no usable entry, so return undefined. */
    read(): RawEvaluationResponse | undefined;

    /** Must not throw when the entry can't be stored: the evaluations just fetched are still good. */
    write(raw: RawEvaluationResponse): void;
}
