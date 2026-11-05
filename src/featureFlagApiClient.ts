import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import axiosRetry from "axios-retry";
import { Logger, ProviderNotReadyError } from "@openfeature/web-sdk";
import { EvaluationCache, RawEvaluationResponse } from "./evaluationCache.js";
import { EvaluationResponse } from "./evaluationResponse.js";
import { FeatureFlagEvaluator } from "./featureFlagEvaluator.js";
import { octopusHttpHeaderNames } from "./octopusHttpHeaderNames.js";
import { ProductMetadata } from "./productMetadata.js";
import { parseServerSideEvaluations } from "./v4/parseServerSideEvaluation.js";

/**
 * Kept separate from each provider's public configuration so a provider can change its own API without changing
 * the client's.
 *
 * @internal
 */
export interface FeatureFlagApiClientOptions {
    clientIdentifier: string;
    productMetadata: ProductMetadata;
    serverUri?: string;
    releaseVersionOverride?: string;
    logger: Logger;
    /** Identifies the provider package in the X-Octopus-Client header, e.g. openfeature-provider-ts-web/5.0.2. */
    providerMetadata: { name: string; version: string };
    cache: EvaluationCache;
}

/** @internal */
export class FeatureFlagApiClient {
    private readonly clientIdentifier: string;
    private readonly serverUri: string;
    private readonly logger: Logger;
    private readonly axiosInstance: AxiosInstance;
    private readonly releaseVersionOverride?: string;
    private readonly productMetadata: ProductMetadata;
    private readonly providerMetadata: { name: string; version: string };
    private readonly cache: EvaluationCache;

    constructor(options: FeatureFlagApiClientOptions) {
        this.clientIdentifier = options.clientIdentifier;
        this.serverUri = options.serverUri ? options.serverUri.replace(/\/$/, "") : "https://features.octopus.com";
        this.releaseVersionOverride = options.releaseVersionOverride;
        this.productMetadata = options.productMetadata;
        this.logger = options.logger;
        this.providerMetadata = options.providerMetadata;
        this.cache = options.cache;
        this.axiosInstance = axios.create();
        axiosRetry(this.axiosInstance, {
            retries: 3,
            onRetry: (retryCount, error) =>
                this.logger.warn(
                    `Failed to retrieve feature flags ${retryCount} time(s) for client identifier ${this.clientIdentifier} from ${this.serverUri} with error: \n ${JSON.stringify(error)}`
                ),
        });
    }

    /**
     * @throws {ProviderNotReadyError} when the server returned nothing usable and no cached evaluations are available.
     */
    async getEvaluator(): Promise<FeatureFlagEvaluator> {
        const raw = await this.fetchEvaluations();

        if (raw === undefined) {
            throw new ProviderNotReadyError(
                `Unable to retrieve feature flags for client identifier ${this.clientIdentifier} from ${this.serverUri}, and no cached evaluations are available.`
            );
        }

        return new FeatureFlagEvaluator(parseEvaluationResponse(raw), this.logger);
    }

    private async fetchEvaluations(): Promise<RawEvaluationResponse | undefined> {
        const raw = await this.fetchEvaluationsFromServer();

        if (raw === undefined) {
            return this.cache.read();
        }

        this.cache.write(raw);

        return raw;
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
        return `${value} ${this.providerMetadata.name}/${this.providerMetadata.version}`;
    }
}

function parseEvaluationResponse(raw: RawEvaluationResponse): EvaluationResponse {
    return { evaluations: parseServerSideEvaluations(raw.evaluations), contentHash: raw.contentHash };
}
