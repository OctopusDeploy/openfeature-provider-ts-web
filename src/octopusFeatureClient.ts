import axios, { AxiosRequestConfig } from "axios";
import { FeatureToggleEvaluation, FeatureToggles, OctopusFeatureContext } from "./octopusFeatureContext";
import { OctopusFeatureConfiguration } from "./octopusFeatureProvider";

export class OctopusFeatureClient {
    private context: OctopusFeatureContext;
    private configuration: OctopusFeatureConfiguration;

    constructor(configuration: OctopusFeatureConfiguration) {
        this.context = new OctopusFeatureContext({ evaluations: [], contentHash: "" });
        this.configuration = configuration;
    }

    async getEvaluationContext(): Promise<OctopusFeatureContext> {
        // If the features have not changed, return the feature set

        if (!(await this.haveFeaturesChanged())) {
            return this.context;
        }

        const manifest = await this.getFeatureManifest();

        if (manifest === undefined) {
            return this.context;
        }

        this.context = new OctopusFeatureContext(manifest);

        return this.context;
    }

    async haveFeaturesChanged(): Promise<boolean> {
        if (this.context.toggles.contentHash === "") return true;

        const config: AxiosRequestConfig = {
            url: `api/featuretoggles/${this.configuration.clientIdentifier}/check`,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            method: "GET",
            responseType: "json",
        };

        // TODO: Validate this behaviour if the array is null
        const response = await axios.request<Uint8Array>(config);

        if (!response.data.length) {
            return true;
        }

        const decoder = new TextDecoder("utf8");
        const decodedContentHash = btoa(decoder.decode(response.data));

        const haveFeaturesChanged = this.context.toggles.contentHash !== decodedContentHash;

        return haveFeaturesChanged;
    }

    async getFeatureManifest(): Promise<FeatureToggles | undefined> {
        const config: AxiosRequestConfig = {
            url: `api/featuretoggles/v2/${this.configuration.clientIdentifier}`,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            method: "GET",
            responseType: "json",
        };

        const response = await axios.request<FeatureToggleEvaluation[]>(config);

        if (response.status == 404) {
            return undefined;
        }

        if (!response.headers["ContentHash"]) {
            return undefined;
        }

        return { evaluations: response.data, contentHash: response.headers["ContentHash"] };
    }
}
