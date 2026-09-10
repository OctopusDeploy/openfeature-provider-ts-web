import {
    DefaultLogger,
    EvaluationContext,
    FlagNotFoundError,
    JsonValue,
    Logger,
    Provider,
    ProviderNotReadyError,
    ResolutionDetails,
    TypeMismatchError,
} from "@openfeature/web-sdk";
import { FeatureFlagApiClient } from "./featureFlagApiClient";
import { FeatureFlagEvaluator } from "./featureFlagEvaluator";
import { OctopusFeatureConfiguration } from "./octopusFeatureConfiguration";

export class OctopusFeatureProvider implements Provider {
    private readonly logger: Logger;
    private client: FeatureFlagApiClient;
    private evaluator: FeatureFlagEvaluator | undefined;
    private context: EvaluationContext;

    constructor(configuration: OctopusFeatureConfiguration) {
        this.logger = configuration.logger ?? new DefaultLogger();
        this.client = new FeatureFlagApiClient(configuration);
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

        try {
            this.evaluator = await this.client.getEvaluator();
        } catch (e) {
            this.logger.error("Octopus feature flags are unavailable, and every evaluation will report PROVIDER_NOT_READY.", e);
        }
    }

    async onContextChange(oldContext: EvaluationContext, newContext: EvaluationContext): Promise<void> {
        this.context = newContext;
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
