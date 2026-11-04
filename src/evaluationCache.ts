/**
 * Unparsed, exactly as received from the v4 endpoint.
 *
 * @internal
 */
export interface RawEvaluationResponse {
    evaluations: unknown;
    contentHash: string;
}

/**
 * The last evaluations fetched, kept so the provider can still start when the server can't be reached.
 *
 * @internal
 */
export interface EvaluationCache {
    /** Returns undefined when there is no usable entry. */
    read(): RawEvaluationResponse | undefined;

    /** Must not throw when the entry can't be stored: the evaluations just fetched are still good. */
    write(raw: RawEvaluationResponse): void;
}
