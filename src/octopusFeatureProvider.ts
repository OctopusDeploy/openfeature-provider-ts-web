import { EvaluationContext, JsonValue, Logger, Provider, ResolutionDetails } from "@openfeature/web-sdk";
import { OctopusFeatureClient } from "./octopusFeatureClient";
import { OctopusFeatureContext } from "./octopusFeatureContext";

export interface OctopusFeatureConfiguration {
    /** The ClientIdentifier provided by the Octopus variable Octopus.FeatureToggles.ClientIdentifier */
    clientIdentifier: string;

    serverUri?: string;

    logger?: Logger;

    /** Overrides the reported version of the release that would typically
     be extracted from the value embedded in the ClientIdentifier Token at deploy time. */
    releaseVersionOverride?: string;
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

    async initialize(): Promise<void> {
        this.evaluationContext = await this.client.getEvaluationContext();
    }

    async onContextChange(oldContext: EvaluationContext, newContext: EvaluationContext): Promise<void> {
        this.context = newContext;
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
