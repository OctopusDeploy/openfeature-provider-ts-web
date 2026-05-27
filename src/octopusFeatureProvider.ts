import { EvaluationContext, JsonValue, Logger, Provider, ResolutionDetails } from "@openfeature/web-sdk";
import { OctopusFeatureClient } from "./octopusFeatureClient";
import { OctopusFeatureContext } from "./octopusFeatureContext";
import { ProductMetadata } from "./productMetadata";

export interface OctopusFeatureConfiguration {
    /** The ClientIdentifier provided by the Octopus variable Octopus.FeatureToggles.ClientIdentifier */
    clientIdentifier: string;

    /** Metadata about the application using the OpenFeature provider. Used to populate header for telemetry. */
    productMetadata: ProductMetadata;

    serverUri?: string;

    logger?: Logger;

    /** Overrides the application release version embedded in the ClientIdentifier */
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
        name: "octopus-ts-web-provider",
    };

    readonly runsOn = "client";

    hooks = [];

    async initialize(context?: EvaluationContext): Promise<void> {
        this.evaluationContext = await this.client.getEvaluationContext();
        if (context) {
            this.context = context;
        }
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
