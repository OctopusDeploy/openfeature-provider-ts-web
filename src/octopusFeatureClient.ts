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
                if (this.isV1CacheEntry(cacheEntry)) {
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

    isV1CacheEntry(entry: unknown): entry is V1CacheEntry {
        const possibleV1CacheEntry = entry as V1CacheEntry;
        return (
            possibleV1CacheEntry.schemaVersion === "v1" &&
            possibleV1CacheEntry.contents !== undefined &&
            possibleV1CacheEntry.contents.evaluations !== undefined &&
            possibleV1CacheEntry.contents.contentHash !== undefined
        );
    }

    async getFeatureManifest(): Promise<V1FeatureToggles | undefined> {
        // A very basic test to see if we have a JWT-formatted client identifier
        const tokenSegments = this.clientIdentifier.split(".");
        const isV3ClientIdentifier = tokenSegments.length === 3;

        let config: AxiosRequestConfig;
        if (isV3ClientIdentifier) {
            config = {
                url: `${this.serverUri}/api/featuretoggles/v3/`,
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
        } else {
            config = {
                url: `${this.serverUri}/api/featuretoggles/v2/${this.clientIdentifier}`,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                method: "GET",
                responseType: "json",
            };
        }

        // WARNING: v2 and v3 endpoints have identical response contracts.
        // If for any reason the v3 endpoint response contract starts to diverge from the v2 contract,
        // This code will need to update accordingly
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
