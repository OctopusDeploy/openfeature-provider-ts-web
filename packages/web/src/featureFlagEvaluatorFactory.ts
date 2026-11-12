import { Logger, ProviderNotReadyError } from "@openfeature/web-sdk";
import { EvaluationCache, FeatureFlagApiClient, FeatureFlagEvaluator, parseEvaluationResponse } from "@octopusdeploy/openfeature-core";

/**
 * Builds the evaluator the web provider evaluates against, from the API client's evaluations or, when the server has
 * nothing usable, from the last evaluations it cached.
 *
 * Web fetches once per initialization, so unlike server's FeatureFlagEvaluatorCache there is nothing to keep between
 * calls and no polling.
 *
 * @internal
 */
export class FeatureFlagEvaluatorFactory {
    constructor(
        private readonly client: FeatureFlagApiClient,
        private readonly cache: EvaluationCache,
        private readonly logger: Logger
    ) {}

    /**
     * @throws {ProviderNotReadyError} when the server returned nothing usable and no cached evaluations are available.
     */
    async createEvaluator(): Promise<FeatureFlagEvaluator> {
        let raw = await this.client.getServerSideEvaluations();

        if (raw === undefined) {
            raw = this.cache.read();
        } else {
            this.cache.write(raw);
        }

        if (raw === undefined) {
            throw new ProviderNotReadyError("Unable to retrieve feature flags, and no cached evaluations are available.");
        }

        return new FeatureFlagEvaluator(parseEvaluationResponse(raw), this.logger);
    }
}
