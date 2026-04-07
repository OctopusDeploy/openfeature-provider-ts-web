import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import { V2FeatureToggleEvaluation, V2FeatureToggles, OctopusFeatureContext } from "./octopusFeatureContext";
import { OctopusFeatureConfiguration } from "./octopusFeatureProvider";
import { DefaultLogger, Logger } from "@openfeature/web-sdk";

interface V2CacheEntry {
    schemaVersion: "v2";
    contents: V2FeatureToggles;
}

export class OctopusFeatureClient {
    private readonly clientIdentifier: string;
    private readonly serverUri: string;
    private readonly logger: Logger;
    private readonly axiosInstance: AxiosInstance;
    private readonly localStorageKey = "octopus-openfeature-ts-feature-manifest";
    private readonly releaseVersionOverride?: string;

    constructor(configuration: OctopusFeatureConfiguration) {
        this.clientIdentifier = configuration.clientIdentifier;
        this.serverUri = configuration.serverUri ? configuration.serverUri.replace(/\/$/, "") : "https://features.octopus.com";
        this.releaseVersionOverride = configuration.releaseVersionOverride;
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
                if (this.isV2CacheEntry(cacheEntry)) {
                    return new OctopusFeatureContext(cacheEntry.contents);
                }
            } catch (e) {
                this.logger.warn(`An error occurred parsing feature toggles returned from Octopus: ${JSON.stringify(e)}`);
            }

            return new OctopusFeatureContext({ evaluations: [], contentHash: "" });
        }

        const cacheEntry: V2CacheEntry = { schemaVersion: "v2", contents: manifest };
        localStorage.setItem(this.localStorageKey, JSON.stringify(cacheEntry));

        return new OctopusFeatureContext(manifest);
    }

    isV2CacheEntry(entry: unknown): entry is V2CacheEntry {
        const possibleV2CacheEntry = entry as V2CacheEntry;
        return (
            possibleV2CacheEntry.schemaVersion === "v2" &&
            possibleV2CacheEntry.contents !== undefined &&
            possibleV2CacheEntry.contents.evaluations !== undefined &&
            possibleV2CacheEntry.contents.contentHash !== undefined
        );
    }

    async getFeatureManifest(): Promise<V2FeatureToggles | undefined> {
        const config: AxiosRequestConfig = {
            url: `${this.serverUri}/api/toggles/evaluations/v3/`,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            method: "GET",
            responseType: "json",
            headers: {
                Authorization: `Bearer ${this.clientIdentifier}`,
            },
        };
        if (this.releaseVersionOverride) {
            config.headers!["X-Release-Version"] = this.releaseVersionOverride;
        }

        const response = await this.axiosInstance.request<V2FeatureToggleEvaluation[]>(config);

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
