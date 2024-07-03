import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import { FeatureToggleEvaluation, FeatureToggles, OctopusFeatureContext } from "./octopusFeatureContext";
import { OctopusFeatureConfiguration } from "./octopusFeatureProvider";

type SchemaVersion = "v1";

interface CacheEntry {
    schemaVersion: SchemaVersion;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contents: any;
}

export class OctopusFeatureClient {
    private readonly clientIdentifier: string;
    private readonly serverUri: string;
    private readonly axiosInstance: AxiosInstance;
    private readonly localStorageKey = "octopus-openfeature-ts-feature-manifest";

    constructor(configuration: OctopusFeatureConfiguration) {
        this.clientIdentifier = configuration.clientIdentifier;
        this.serverUri = configuration.serverUri ? configuration.serverUri.replace(/\/$/, "") : "https://features.octopus.com";
        this.axiosInstance = axios.create();
        axiosRetry(this.axiosInstance, { retries: 3 });
    }

    async getEvaluationContext(): Promise<OctopusFeatureContext> {
        const manifest = await this.getFeatureManifest();

        if (manifest === undefined) {
            const rawCache = localStorage.getItem(this.localStorageKey);
            if (rawCache === null) {
                return new OctopusFeatureContext({ evaluations: [], contentHash: "" });
            }

            try {
                const cacheEntry = JSON.parse(rawCache);
                if (this.isCacheEntry(cacheEntry) && this.isFeatureToggles(cacheEntry.contents)) {
                    return new OctopusFeatureContext(cacheEntry.contents);
                }
            } catch (e) {
                // TODO Logging
            }

            return new OctopusFeatureContext({ evaluations: [], contentHash: "" });
        }

        const cacheEntry: CacheEntry = { schemaVersion: "v1", contents: manifest };
        localStorage.setItem(this.localStorageKey, JSON.stringify(cacheEntry));

        return new OctopusFeatureContext(manifest);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isCacheEntry(entry: any): entry is CacheEntry {
        return (entry as CacheEntry).schemaVersion !== undefined && (entry as CacheEntry).contents !== undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isFeatureToggles(featureToggles: any): featureToggles is FeatureToggles {
        return (featureToggles as FeatureToggles).evaluations !== undefined && (featureToggles as FeatureToggles).contentHash !== undefined;
    }

    async getFeatureManifest(): Promise<FeatureToggles | undefined> {
        const config: AxiosRequestConfig = {
            url: `${this.serverUri}/api/featuretoggles/v2/${this.clientIdentifier}`,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            method: "GET",
            responseType: "json",
        };

        const response = await this.axiosInstance.request<FeatureToggleEvaluation[]>(config);

        if (response.status == 404) {
            return undefined;
        }

        // @ts-ignore
        const contentHash = response.headers.get("ContentHash");
        if (!contentHash) {
            return undefined;
        }

        return { evaluations: response.data, contentHash: contentHash };
    }
}
