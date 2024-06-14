import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import { FeatureToggleEvaluation, FeatureToggles, OctopusFeatureContext } from "./octopusFeatureContext";
import { OctopusFeatureConfiguration } from "./octopusFeatureProvider";

export class OctopusFeatureClient {
    private readonly clientIdentifier: string;
    private readonly serverUri: string;
    private readonly axiosInstance: AxiosInstance;

    constructor(configuration: OctopusFeatureConfiguration) {
        this.clientIdentifier = configuration.clientIdentifier;
        this.serverUri = configuration.serverUri ? configuration.serverUri.replace(/\/$/, "") : "https://features.octopus.com";
        this.axiosInstance = axios.create();
        axiosRetry(this.axiosInstance, { retries: 3 });
    }

    async getEvaluationContext(): Promise<OctopusFeatureContext> {
        const manifest = await this.getFeatureManifest();

        if (manifest === undefined) {
            return new OctopusFeatureContext({ evaluations: [], contentHash: "" });
        }

        return new OctopusFeatureContext(manifest);
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
