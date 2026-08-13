import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import axiosRetry from "axios-retry";
import { DefaultLogger, Logger } from "@openfeature/web-sdk";
import { OctopusFeatureContext } from "./featureFlagEvaluator";
import { OctopusFeatureConfiguration } from "./octopusFeatureProvider";
import { ProductMetadata } from "./productMetadata";
import { parseServerSideEvaluations } from "./v4/parseServerSideEvaluation";
import { PROVIDER_VERSION } from "./version";

interface FeatureManifest {
    // Unparsed, exactly as received from the v4 endpoint (or replayed from a cache entry).
    evaluations: unknown;
    contentHash: string;
}

interface V3CacheEntry {
    // Note: This counts cache shapes, not endpoint versions.
    schemaVersion: "v3";
    contents: FeatureManifest;
}

export class OctopusFeatureClient {
    private readonly clientIdentifier: string;
    private readonly serverUri: string;
    private readonly logger: Logger;
    private readonly axiosInstance: AxiosInstance;
    private readonly localStorageKey = "octopus-openfeature-ts-feature-manifest";
    private readonly releaseVersionOverride?: string;
    private readonly productMetadata: ProductMetadata;

    constructor(configuration: OctopusFeatureConfiguration) {
        this.clientIdentifier = configuration.clientIdentifier;
        this.serverUri = configuration.serverUri ? configuration.serverUri.replace(/\/$/, "") : "https://features.octopus.com";
        this.releaseVersionOverride = configuration.releaseVersionOverride;
        this.productMetadata = configuration.productMetadata;
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
            return this.getEvaluationContextFromCache();
        }

        const cacheEntry: V3CacheEntry = { schemaVersion: "v3", contents: manifest };
        localStorage.setItem(this.localStorageKey, JSON.stringify(cacheEntry));

        return new OctopusFeatureContext(parseServerSideEvaluations(manifest.evaluations), this.logger);
    }

    private getEvaluationContextFromCache(): OctopusFeatureContext {
        const rawCache = localStorage.getItem(this.localStorageKey);
        if (rawCache === null) {
            return this.emptyContext();
        }

        try {
            const cacheEntry = JSON.parse(rawCache);
            if (this.isV3CacheEntry(cacheEntry)) {
                return new OctopusFeatureContext(parseServerSideEvaluations(cacheEntry.contents.evaluations), this.logger);
            }

            // The cached entry is from an old cache schema version.
            localStorage.removeItem(this.localStorageKey);
        } catch (e) {
            this.logger.warn(`Failed to retrieve feature flags: ${JSON.stringify(e)}`);
        }

        return this.emptyContext();
    }

    private emptyContext(): OctopusFeatureContext {
        return new OctopusFeatureContext([], this.logger);
    }

    private isV3CacheEntry(entry: unknown): entry is V3CacheEntry {
        const possibleV3CacheEntry = entry as V3CacheEntry;
        return (
            possibleV3CacheEntry.schemaVersion === "v3" &&
            possibleV3CacheEntry.contents !== undefined &&
            possibleV3CacheEntry.contents.evaluations !== undefined &&
            possibleV3CacheEntry.contents.contentHash !== undefined
        );
    }

    async getFeatureManifest(): Promise<FeatureManifest | undefined> {
        const config: AxiosRequestConfig = {
            url: `${this.serverUri}/api/feature-flags/evaluations/v4/`,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            method: "GET",
            responseType: "json",
            headers: {
                Authorization: `Bearer ${this.clientIdentifier}`,
                "X-Octopus-Client": this.buildOctopusClientHeaderValue(),
            },
        };
        if (this.releaseVersionOverride) {
            config.headers!["X-Release-Version"] = this.releaseVersionOverride;
        }

        const response = await this.requestEvaluations(config);

        if (response === undefined) {
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

    /**
     * Reports no manifest, rather than rejecting, when the request fails: an unreachable server, or any
     * unsuccessful status once axios-retry has given up.
     */
    private async requestEvaluations(config: AxiosRequestConfig): Promise<AxiosResponse<unknown> | undefined> {
        try {
            return await this.axiosInstance.request<unknown>(config);
        } catch (e) {
            this.logger.warn(
                `Failed to retrieve feature manifest during initialization. Falling back to cached evaluations, if present.\n${JSON.stringify(e)}`
            );
            return undefined;
        }
    }

    private buildOctopusClientHeaderValue(): string {
        let value = this.productMetadata.name;
        if (this.productMetadata.version) {
            value += `/${this.productMetadata.version}`;
        }
        return `${value} openfeature-provider-ts-web/${PROVIDER_VERSION}`;
    }
}
