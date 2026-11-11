import {
    DefaultLogger,
    EvaluationContext,
    FlagNotFoundError,
    Hook,
    JsonValue,
    OpenFeatureEventEmitter,
    Provider,
    ProviderEvents,
    ProviderMetadata,
    ProviderNotReadyError,
    ResolutionDetails,
    TypeMismatchError,
} from "@openfeature/server-sdk";
import { FeatureFlagApiClient, FeatureFlagEvaluator } from "@octopusdeploy/openfeature-core";
import { FeatureFlagEvaluatorCache } from "./featureFlagEvaluatorCache.js";
import { OctopusFeatureConfiguration } from "./octopusFeatureConfiguration.js";
import { PROVIDER_VERSION } from "./version.js";

// The same as the .NET and Java providers.
const defaultCacheDurationMs = 60_000;

export class OctopusFeatureProvider implements Provider {
    private readonly evaluatorCache: FeatureFlagEvaluatorCache;

    constructor(configuration: OctopusFeatureConfiguration) {
        const logger = configuration.logger ?? new DefaultLogger();
        const client = new FeatureFlagApiClient({
            clientIdentifier: configuration.clientIdentifier,
            productMetadata: configuration.productMetadata,
            serverUri: configuration.serverUri,
            releaseVersionOverride: configuration.releaseVersionOverride,
            logger,
            providerMetadata: { name: "openfeature-provider-ts-server", version: PROVIDER_VERSION },
        });
        this.evaluatorCache = new FeatureFlagEvaluatorCache({
            client,
            cacheDurationMs: configuration.cacheDurationMs ?? defaultCacheDurationMs,
            logger,
            // Initialization failed, so the SDK has the provider in ERROR. Ready moves it back now flags are available.
            onRecovered: () => this.events.emit(ProviderEvents.Ready),
        });
    }

    metadata: ProviderMetadata = {
        name: "octopus-ts-server-provider",
    };

    readonly runsOn = "server";

    hooks: Hook[] = [];

    readonly events = new OpenFeatureEventEmitter();

    async initialize(): Promise<void> {
        // A rejection moves the provider to ERROR and rejects setProviderAndWait, so the caller learns the flags are
        // unavailable instead of every slug quietly reading as FLAG_NOT_FOUND. The cache keeps polling regardless, as
        // the .NET and Java providers do, so the provider recovers once the server is reachable.
        await this.evaluatorCache.initialize();
    }

    async onClose(): Promise<void> {
        await this.evaluatorCache.shutdown();
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
        const evaluator = this.evaluatorCache.getEvaluator();
        if (!evaluator) {
            throw new ProviderNotReadyError("No Octopus feature flags are available. The provider failed to initialize, or was used before initializing.");
        }
        return evaluator;
    }
}
