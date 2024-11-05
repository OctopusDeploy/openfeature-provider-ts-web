import { EvaluationContext, JsonValue, Logger, Provider, ResolutionDetails } from "@openfeature/web-sdk";
import { OctopusFeatureClient } from "./octopusFeatureClient";
import { OctopusFeatureContext } from "./octopusFeatureContext";

export interface OctopusFeatureConfiguration {
    clientIdentifier: string;
    serverUri?: string;
    logger?: Logger;
}

export interface ContextValue {
    value: string;
    hashedValue: string;
}

export class OctopusFeatureProvider implements Provider {
    private client: OctopusFeatureClient;
    private evaluationContext: OctopusFeatureContext;
    public context: Record<string, ContextValue>;

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

    async getSha256Hash(value: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(value);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashBase64 = btoa(String.fromCharCode(...hashArray));
        return hashBase64;
    }

    async onContextChange(oldContext: EvaluationContext, newContext: EvaluationContext): Promise<void> {
        const hashedContext: Record<string, ContextValue> = {};
        await Promise.all(
            Object.keys(newContext).map(async (contextKey) => {
                const contextValue = newContext[contextKey];
                if (typeof contextValue === "string") {
                    hashedContext[contextKey] = { value: contextValue, hashedValue: await this.getSha256Hash(contextValue) };
                } else {
                    hashedContext[contextKey] = { value: "", hashedValue: "" };
                }
            })
        );
        this.context = hashedContext;
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
