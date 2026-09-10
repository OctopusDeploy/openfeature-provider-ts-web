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

    /**
     * Retrieves the feature flag evaluations, falling back to those cached by an earlier page load.
     *
     * Resolves either way: a provider that cannot evaluate is not a reason to fail the page load that set it, so a
     * failure is reported through the evaluations themselves rather than by rejecting. Having retrieved nothing, the
     * provider holds no evaluator, and every evaluation reports PROVIDER_NOT_READY.
     */
    async initialize(context?: EvaluationContext): Promise<void> {
        if (context) {
            this.context = context;
        }

        try {
            this.evaluator = await this.client.getEvaluator();
        } catch (e) {
            // Swallowing the error leaves this log as the only trace of it, so the error goes to the logger itself:
            // an Error stringifies to "{}", taking the reason we could not evaluate with it.
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
