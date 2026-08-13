import { DefaultLogger, EvaluationContext, FlagNotFoundError, JsonValue, Logger, Provider, ResolutionDetails, TypeMismatchError } from "@openfeature/web-sdk";
import { FeatureFlagApiClient } from "./featureFlagApiClient";
import { FeatureFlagEvaluator } from "./featureFlagEvaluator";
import { OctopusFeatureConfiguration } from "./octopusFeatureConfiguration";

export class OctopusFeatureProvider implements Provider {
    private readonly logger: Logger;
    private client: FeatureFlagApiClient;
    private evaluator: FeatureFlagEvaluator;
    private context: EvaluationContext;

    constructor(configuration: OctopusFeatureConfiguration) {
        this.logger = configuration.logger ?? new DefaultLogger();
        this.client = new FeatureFlagApiClient(configuration);
        this.evaluator = FeatureFlagEvaluator.empty(this.logger);
        this.context = {};
    }

    metadata = {
        name: "octopus-ts-web-provider",
    };

    readonly runsOn = "client";

    hooks = [];

    async initialize(context?: EvaluationContext): Promise<void> {
        this.evaluator = await this.client.getEvaluator();
        if (context) {
            this.context = context;
        }
    }

    async onContextChange(oldContext: EvaluationContext, newContext: EvaluationContext): Promise<void> {
        this.context = newContext;
    }

    resolveBooleanEvaluation(flagKey: string, defaultValue: boolean): ResolutionDetails<boolean> {
        return this.evaluator.evaluate(flagKey, this.context);
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
        if (!this.evaluator.findEvaluationBySlug(flagKey)) {
            throw new FlagNotFoundError(flagKey);
        }
        throw new TypeMismatchError("Octopus only supports boolean flags.");
    }
}
