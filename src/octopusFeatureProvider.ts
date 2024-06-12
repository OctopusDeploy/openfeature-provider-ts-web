import { EvaluationContext, JsonValue, Provider, ResolutionDetails } from "@openfeature/web-sdk";
import { OctopusFeatureClient } from "./octopusFeatureClient";
import { OctopusFeatureContext } from "./octopusFeatureContext";

export interface OctopusFeatureConfiguration {
    clientIdentifier: string;
    serverUri?: string;
}

export class OctopusFeatureProvider implements Provider {
    private client: OctopusFeatureClient;
    private evaluationContext: OctopusFeatureContext;
    private context: EvaluationContext;

    constructor(configuration: OctopusFeatureConfiguration) {
        this.client = new OctopusFeatureClient(configuration);
        this.evaluationContext = new OctopusFeatureContext({ evaluations: [], contentHash: "" });
        this.context = {};
    }

    metadata = {
        name: OctopusFeatureProvider.name,
    };

    readonly runsOn = "client";

    hooks = [];

    async onContextChange(oldContext: EvaluationContext, newContext: EvaluationContext): Promise<void> {
        // code to run to reconcile the providers state with the newly updated context
        this.context = newContext;
        this.evaluationContext = await this.client.getEvaluationContext();
    }

    resolveBooleanEvaluation(flagKey: string, defaultValue: boolean): ResolutionDetails<boolean> {
        const isFeatureEnabled = this.evaluationContext.evaluate(flagKey, defaultValue, this.context);

        return isFeatureEnabled;
    }

    resolveStringEvaluation(flagKey: string, defaultValue: string): ResolutionDetails<string> {
        throw new Error("Octopus Features only support boolean toggles.");
    }

    resolveNumberEvaluation(flagKey: string, defaultValue: number): ResolutionDetails<number> {
        throw new Error("Octopus Features only support boolean toggles.");
    }

    resolveObjectEvaluation<U extends JsonValue>(flagKey: string, defaultValue: U): ResolutionDetails<U> {
        throw new Error("Octopus Features only support boolean toggles.");
    }
}
