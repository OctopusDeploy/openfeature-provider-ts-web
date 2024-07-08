import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import { FeatureToggleEvaluation, FeatureToggles, OctopusFeatureContext } from "./octopusFeatureContext";
import { OctopusFeatureConfiguration } from "./octopusFeatureProvider";
import { DefaultLogger, Logger } from "@openfeature/web-sdk";

type SchemaVersion = "v1";

interface CacheEntry {
    schemaVersion: SchemaVersion;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contents: any;
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
                    error,
                    `Failed to retrieve feature toggles for client identifier ${this.clientIdentifier} from ${this.serverUri} ${retryCount} times...`
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
                this.logger.warn(e, "An error occurred parsing feature toggles returned from OctoToggle.");
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
