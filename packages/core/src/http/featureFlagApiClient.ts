import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig, AxiosResponse, GenericAbortSignal, RawAxiosHeaders } from "axios";
import axiosRetry, { isNetworkOrIdempotentRequestError } from "axios-retry";
import { Logger } from "@openfeature/core";
import { RawEvaluationResponse } from "../evaluation/evaluationResponse.js";
import { ProductMetadata } from "../configuration/productMetadata.js";
import { octopusHttpHeaderNames } from "./octopusHttpHeaderNames.js";

const requestTimeoutMs = 100_000;

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
}

/**
 * Retrieves evaluations from the Feature Flags service, and nothing more. Turning them into an evaluator, falling back
 * to a cache, and deciding when to fetch again are each provider's job.
 *
 * @internal
 */
export class FeatureFlagApiClient {
    private readonly clientIdentifier: string;
    private readonly serverUri: string;
    private readonly logger: Logger;
    private readonly axiosInstance: AxiosInstance;
    private readonly releaseVersionOverride?: string;
    private readonly productMetadata: ProductMetadata;
    private readonly providerMetadata: { name: string; version: string };

    constructor(options: FeatureFlagApiClientOptions) {
        this.clientIdentifier = options.clientIdentifier;
        this.serverUri = options.serverUri ? options.serverUri.replace(/\/$/, "") : "https://features.octopus.com";
        this.releaseVersionOverride = options.releaseVersionOverride;
        this.productMetadata = options.productMetadata;
        this.logger = options.logger;
        this.providerMetadata = options.providerMetadata;
        // A request that never gets a response would otherwise stall polling for good. 100s matches .NET's HttpClient default.
        this.axiosInstance = axios.create({ timeout: requestTimeoutMs });
        axiosRetry(this.axiosInstance, {
            retries: 3,
            // axios-retry's default treats a cancelled GET as retryable, so each cancellation would be retried and
            // logged as a failure.
            retryCondition: (error) => !axios.isCancel(error) && isNetworkOrIdempotentRequestError(error),
            onRetry: (retryCount, error) =>
                this.logger.warn(
                    `Failed to retrieve feature flags ${retryCount} time(s) for client identifier ${this.clientIdentifier} from ${this.serverUri} with error: \n ${JSON.stringify(error)}`
                ),
        });
    }

    /**
     * Asks the server whether the evaluations identified by contentHash are still current. This is much cheaper than
     * fetching the evaluations again, so a provider that polls checks first.
     *
     * @throws when the server can't be reached or does not return a content hash, so the caller can keep what it has.
     */
    async haveFeaturesChanged(contentHash: string, signal?: GenericAbortSignal): Promise<boolean> {
        if (!contentHash) {
            return true;
        }

        const response = await this.axiosInstance.request<unknown>({
            url: `${this.serverUri}/api/feature-flags/check/v4/`,
            method: "GET",
            responseType: "json",
            headers: this.buildRequestHeaders(),
            signal,
        });

        const current = parseFeatureCheck(response.data);
        if (current === undefined) {
            throw new Error(`Feature flag check from ${this.serverUri} did not return a valid content hash.`);
        }

        return current !== contentHash;
    }

    /**
     * Fetches the current evaluations, unparsed, so a provider can cache them exactly as received.
     *
     * Resolves to undefined, rather than rejecting, when the server returned nothing usable.
     *
     * @throws when signal aborts the request, so a cancellation is never mistaken for an outage.
     */
    async getServerSideEvaluations(signal?: GenericAbortSignal): Promise<RawEvaluationResponse | undefined> {
        const config: AxiosRequestConfig = {
            url: `${this.serverUri}/api/feature-flags/evaluations/v4/`,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            method: "GET",
            responseType: "json",
            headers: this.buildRequestHeaders(),
            signal,
        };

        const response = await this.requestEvaluations(config);

        if (response === undefined) {
            return undefined;
        }

        // from() returns AxiosHeaders as they are and wraps a plain object, so the lookup is case-insensitive either way.
        // Axios's own response header types don't match from()'s parameter, so they need the cast.
        const contentHash = AxiosHeaders.from(response.headers as RawAxiosHeaders).get(octopusHttpHeaderNames.contentHash);
        if (typeof contentHash !== "string" || contentHash === "") {
            this.logger.warn(`Feature flag response from ${this.serverUri} did not contain expected ContentHash header.`);
            return undefined;
        }

        return { evaluations: response.data, contentHash: contentHash };
    }

    /**
     * Reports no evaluations, rather than rejecting, when the request fails: an unreachable server, or any
     * unsuccessful status once axios-retry has given up. A cancelled request still rejects, because the caller asked
     * for it and nothing failed.
     */
    private async requestEvaluations(config: AxiosRequestConfig): Promise<AxiosResponse<unknown> | undefined> {
        try {
            return await this.axiosInstance.request<unknown>(config);
        } catch (e) {
            if (axios.isCancel(e)) {
                throw e;
            }
            this.logger.warn(`Failed to retrieve feature flag evaluations from ${this.serverUri}.\n${JSON.stringify(e)}`);
            return undefined;
        }
    }

    private buildRequestHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.clientIdentifier}`,
            [octopusHttpHeaderNames.octopusClient]: this.buildOctopusClientHeaderValue(),
        };
        if (this.releaseVersionOverride) {
            headers[octopusHttpHeaderNames.releaseVersion] = this.releaseVersionOverride;
        }
        return headers;
    }

    private buildOctopusClientHeaderValue(): string {
        let value = this.productMetadata.name;
        if (this.productMetadata.version) {
            value += `/${this.productMetadata.version}`;
        }
        return `${value} ${this.providerMetadata.name}/${this.providerMetadata.version}`;
    }
}

/** The check endpoint returns the current content hash base64-encoded, the same form as the ContentHash header. */
function parseFeatureCheck(data: unknown): string | undefined {
    if (typeof data !== "object" || data === null) {
        return undefined;
    }
    const contentHash = (data as { contentHash?: unknown }).contentHash;
    return typeof contentHash === "string" && contentHash !== "" ? contentHash : undefined;
}
