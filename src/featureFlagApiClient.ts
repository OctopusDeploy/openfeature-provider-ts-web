import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import axiosRetry from "axios-retry";
import { DefaultLogger, Logger } from "@openfeature/web-sdk";
import { EvaluationResponse } from "./evaluationResponse";
import { FeatureFlagEvaluator } from "./featureFlagEvaluator";
import { OctopusFeatureConfiguration } from "./octopusFeatureConfiguration";
import { octopusHttpHeaderNames } from "./octopusHttpHeaderNames";
import { ProductMetadata } from "./productMetadata";
import { parseServerSideEvaluations } from "./v4/parseServerSideEvaluation";
import { PROVIDER_VERSION } from "./version";

interface RawEvaluationResponse {
    // Unparsed, exactly as received from the v4 endpoint (or retrieved from a cache entry).
    evaluations: unknown;
    contentHash: string;
}

interface EvaluationCacheEntry {
    cacheSchemaVersion: 3;
    contents: RawEvaluationResponse;
}

/** @internal */
export class FeatureFlagApiClient {
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
                    `Failed to retrieve feature flags ${retryCount} time(s) for client identifier ${this.clientIdentifier} from ${this.serverUri} with error: \n ${JSON.stringify(error)}`
                ),
        });
    }

    async getEvaluator(): Promise<FeatureFlagEvaluator> {
        const raw = await this.fetchEvaluations();

        if (raw === undefined) {
            return FeatureFlagEvaluator.empty(this.logger);
        }

        return new FeatureFlagEvaluator(parseEvaluationResponse(raw), this.logger);
    }

    private async fetchEvaluations(): Promise<RawEvaluationResponse | undefined> {
        const raw = await this.fetchEvaluationsFromServer();

        if (raw === undefined) {
            return this.readCachedEvaluations();
        }

        const cacheEntry: EvaluationCacheEntry = { cacheSchemaVersion: 3, contents: raw };
        localStorage.setItem(this.localStorageKey, JSON.stringify(cacheEntry));

        return raw;
    }

    private readCachedEvaluations(): RawEvaluationResponse | undefined {
        const rawCache = localStorage.getItem(this.localStorageKey);
        if (rawCache === null) {
            return undefined;
        }

        try {
            const cacheEntry = JSON.parse(rawCache);
            if (this.isCurrentCacheEntry(cacheEntry)) {
                return cacheEntry.contents;
            }

            // The cached entry is from an old cache schema version.
            localStorage.removeItem(this.localStorageKey);
        } catch (e) {
            this.logger.warn(`Failed to retrieve feature flags: ${JSON.stringify(e)}`);
        }

        return undefined;
    }

    private isCurrentCacheEntry(entry: unknown): entry is EvaluationCacheEntry {
        const possibleCacheEntry = entry as EvaluationCacheEntry;
        return (
            possibleCacheEntry.cacheSchemaVersion === 3 &&
            possibleCacheEntry.contents !== undefined &&
            possibleCacheEntry.contents.evaluations !== undefined &&
            possibleCacheEntry.contents.contentHash !== undefined
        );
    }

    private async fetchEvaluationsFromServer(): Promise<RawEvaluationResponse | undefined> {
        const config: AxiosRequestConfig = {
            url: `${this.serverUri}/api/feature-flags/evaluations/v4/`,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            method: "GET",
            responseType: "json",
            headers: {
                Authorization: `Bearer ${this.clientIdentifier}`,
                [octopusHttpHeaderNames.octopusClient]: this.buildOctopusClientHeaderValue(),
            },
        };
        if (this.releaseVersionOverride) {
            config.headers![octopusHttpHeaderNames.releaseVersion] = this.releaseVersionOverride;
        }

        const response = await this.requestEvaluations(config);

        if (response === undefined) {
            return undefined;
        }

        // @ts-ignore
        const contentHash = response.headers.get(octopusHttpHeaderNames.contentHash);
        if (!contentHash) {
            this.logger.warn(`Feature flag response from ${this.serverUri} did not contain expected ContentHash header.`);
            return undefined;
        }

        return { evaluations: response.data, contentHash: contentHash };
    }

    /**
     * Reports no evaluations, rather than rejecting, when the request fails: an unreachable server, or any
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

function parseEvaluationResponse(raw: RawEvaluationResponse): EvaluationResponse {
    return { evaluations: parseServerSideEvaluations(raw.evaluations), contentHash: raw.contentHash };
}
