import {
    DefaultLogger,
    EvaluationContext,
    FlagNotFoundError,
    JsonValue,
    Provider,
    ProviderNotReadyError,
    ResolutionDetails,
    TypeMismatchError,
} from "@openfeature/web-sdk";
import { FeatureFlagApiClient } from "./featureFlagApiClient.js";
import { FeatureFlagEvaluator } from "./featureFlagEvaluator.js";
import { LocalStorageCache } from "./localStorageCache.js";
import { OctopusFeatureConfiguration } from "./octopusFeatureConfiguration.js";
import { PROVIDER_VERSION } from "./version.js";

export class OctopusFeatureProvider implements Provider {
    private client: FeatureFlagApiClient;
    private evaluator: FeatureFlagEvaluator | undefined;
    private initialization: Promise<void> | undefined;
    private context: EvaluationContext;

    constructor(configuration: OctopusFeatureConfiguration) {
        const logger = configuration.logger ?? new DefaultLogger();
        this.client = new FeatureFlagApiClient({
            clientIdentifier: configuration.clientIdentifier,
            productMetadata: configuration.productMetadata,
            serverUri: configuration.serverUri,
            releaseVersionOverride: configuration.releaseVersionOverride,
            logger,
            providerMetadata: { name: "openfeature-provider-ts-web", version: PROVIDER_VERSION },
            cache: new LocalStorageCache(logger),
        });
        this.context = {};
    }

    metadata = {
        name: "octopus-ts-web-provider",
    };

    readonly runsOn = "client";

    hooks = [];

    async initialize(context?: EvaluationContext): Promise<void> {
        if (context) {
            this.context = context;
        }

        // The SDK initializes a provider again when it is set after being removed. Evaluations from the earlier start
        // must not outlive a fetch that fails this time.
        this.evaluator = undefined;

        this.initialization = this.client.getEvaluator().then((evaluator) => {
            this.evaluator = evaluator;
        });

        // A rejection moves the provider to ERROR and rejects setProviderAndWait, so the caller learns the flags are
        // unavailable instead of every slug quietly reading as FLAG_NOT_FOUND.
        await this.initialization;
    }

    async onContextChange(oldContext: EvaluationContext, newContext: EvaluationContext): Promise<void> {
        this.context = newContext;

        // A context change can arrive while initialization is still fetching. Let it settle so we judge the outcome,
        // not the moment; its own failure has already been reported through initialize.
        await this.initialization?.catch(() => undefined);

        // web-sdk moves a provider to READY after any context change that resolves, which would announce flags that
        // never arrived. Rejecting keeps the provider in ERROR.
        this.requireEvaluator();
    }

    resolveBooleanEvaluation(flagKey: string, defaultValue: boolean): ResolutionDetails<boolean> {
        return this.requireEvaluator().evaluate(flagKey, this.context);
    }

    resolveStringEvaluation(flagKey: string, defaultValue: string): ResolutionDetails<string> {
        return this.rejectNonBooleanEvaluation(flagKey);
    }

    resolveNumberEvaluation(flagKey: string, defaultValue: number): ResolutionDetails<number> {
        return this.rejectNonBooleanEvaluation(flagKey);
    }

    resolveObjectEvaluation<U extends JsonValue>(flagKey: string, defaultValue: U): ResolutionDetails<U> {
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
