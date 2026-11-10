import {
    DefaultLogger,
    EvaluationContext,
    FlagNotFoundError,
    JsonValue,
    Provider,
    ProviderNotReadyError,
    ResolutionDetails,
    TypeMismatchError,
} from "@openfeature/server-sdk";
import { FeatureFlagApiClient, FeatureFlagEvaluator, InMemoryEvaluationCache } from "@octopusdeploy/openfeature-core";
import { OctopusFeatureConfiguration } from "./octopusFeatureConfiguration.js";
import { PROVIDER_VERSION } from "./version.js";

export class OctopusFeatureProvider implements Provider {
    private client: FeatureFlagApiClient;
    private evaluator: FeatureFlagEvaluator | undefined;

    constructor(configuration: OctopusFeatureConfiguration) {
        const logger = configuration.logger ?? new DefaultLogger();
        this.client = new FeatureFlagApiClient({
            clientIdentifier: configuration.clientIdentifier,
            productMetadata: configuration.productMetadata,
            serverUri: configuration.serverUri,
            releaseVersionOverride: configuration.releaseVersionOverride,
            logger,
            providerMetadata: { name: "openfeature-provider-ts-server", version: PROVIDER_VERSION },
            // A Node process has no storage that outlives it, so the cache only lives as long as this provider.
            cache: new InMemoryEvaluationCache(),
        });
    }

    metadata = {
        name: "octopus-ts-server-provider",
    };

    readonly runsOn = "server";

    hooks = [];

    async initialize(): Promise<void> {
        // The SDK initializes a provider again when it is set after being removed. Evaluations from the earlier start
        // must not outlive a fetch that fails this time.
        this.evaluator = undefined;

        // A rejection moves the provider to ERROR and rejects setProviderAndWait, so the caller learns the flags are
        // unavailable instead of every slug quietly reading as FLAG_NOT_FOUND.
        this.evaluator = await this.client.getEvaluator();
    }

    // Server-side evaluation context arrives with every call, so one provider serves every request concurrently. The
    // evaluator is pure, so nothing about one request's context is kept for the next.
    async resolveBooleanEvaluation(flagKey: string, defaultValue: boolean, context: EvaluationContext): Promise<ResolutionDetails<boolean>> {
        return this.requireEvaluator().evaluate(flagKey, context);
    }

    async resolveStringEvaluation(flagKey: string, defaultValue: string): Promise<ResolutionDetails<string>> {
        return this.rejectNonBooleanEvaluation(flagKey);
    }

    async resolveNumberEvaluation(flagKey: string, defaultValue: number): Promise<ResolutionDetails<number>> {
        return this.rejectNonBooleanEvaluation(flagKey);
    }

    async resolveObjectEvaluation<U extends JsonValue>(flagKey: string, defaultValue: U): Promise<ResolutionDetails<U>> {
        return this.rejectNonBooleanEvaluation(flagKey);
    }

    private rejectNonBooleanEvaluation(flagKey: string): never {
        if (!this.requireEvaluator().findEvaluationBySlug(flagKey)) {
            throw new FlagNotFoundError(flagKey);
        }
        throw new TypeMismatchError("Octopus only supports boolean flags.");
    }

    /**
     * Without any evaluations we cannot tell an unknown slug from one we simply never received, so every evaluation
     * reports PROVIDER_NOT_READY instead of masking the outage as FLAG_NOT_FOUND.
     */
    private requireEvaluator(): FeatureFlagEvaluator {
        if (!this.evaluator) {
            throw new ProviderNotReadyError("No Octopus feature flags are available. The provider failed to initialize, or was used before initializing.");
        }
        return this.evaluator;
    }
}
