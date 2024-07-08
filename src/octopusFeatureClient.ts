import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import { V1FeatureToggleEvaluation, V1FeatureToggles, OctopusFeatureContext } from "./octopusFeatureContext";
import { OctopusFeatureConfiguration } from "./octopusFeatureProvider";
import { DefaultLogger, Logger } from "@openfeature/web-sdk";

interface V1CacheEntry {
    schemaVersion: "v1";
    contents: V1FeatureToggles;
}

export class OctopusFeatureClient {
    private readonly clientIdentifier: string;
    private readonly serverUri: string;
    private readonly logger: Logger;
    private readonly axiosInstance: AxiosInstance;
    private readonly localStorageKey = "octopus-openfeature-ts-feature-manifest";

    constructor(configuration: OctopusFeatureConfiguration) {
        this.clientIdentifier = configuration.clientIdentifier;
        this.serverUri = configuration.serverUri ? configuration.serverUri.replace(/\/$/, "") : "https://features.octopus.com";
        this.logger = configuration.logger ?? new DefaultLogger();
        this.axiosInstance = axios.create();
        axiosRetry(this.axiosInstance, {
            retries: 3,
            onRetry: (retryCount, error) =>
                this.logger.warn(
                    `Failed to retrieve feature toggles ${retryCount} time(s) for client identifier ${this.clientIdentifier} from ${this.serverUri} with error: \n ${JSON.stringify(error)}`
                ),
        });
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
                this.logger.warn(`An error occurred parsing feature toggles returned from Octopus: ${JSON.stringify(e)}`);
            }

            return new OctopusFeatureContext({ evaluations: [], contentHash: "" });
        }

        const cacheEntry: V1CacheEntry = { schemaVersion: "v1", contents: manifest };
        localStorage.setItem(this.localStorageKey, JSON.stringify(cacheEntry));

        return new OctopusFeatureContext(manifest);
    }

    isCacheEntry(entry: unknown): entry is V1CacheEntry {
        return (entry as V1CacheEntry).schemaVersion !== "v1" && (entry as V1CacheEntry).contents !== undefined;
    }

    isFeatureToggles(featureToggles: unknown): featureToggles is V1FeatureToggles {
        return (featureToggles as V1FeatureToggles).evaluations !== undefined && (featureToggles as V1FeatureToggles).contentHash !== undefined;
    }

    async getFeatureManifest(): Promise<V1FeatureToggles | undefined> {
        const config: AxiosRequestConfig = {
            url: `${this.serverUri}/api/featuretoggles/v2/${this.clientIdentifier}`,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            method: "GET",
            responseType: "json",
        };

        const response = await this.axiosInstance.request<V1FeatureToggleEvaluation[]>(config);

        if (response.status == 404) {
            this.logger.warn(`Failed to retrieve feature toggles for client identifier ${this.clientIdentifier} from ${this.serverUri}`);
            return undefined;
        }

        // @ts-ignore
        const contentHash = response.headers.get("ContentHash");
        if (!contentHash) {
            this.logger.warn(`Feature toggle response from ${this.serverUri} did not contain expected ContentHash header.`);
            return undefined;
        }

        return { evaluations: response.data, contentHash: contentHash };
    }
}
