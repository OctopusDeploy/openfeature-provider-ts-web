import { Logger } from "@openfeature/web-sdk";
import { ProductMetadata } from "./productMetadata";

export interface OctopusFeatureConfiguration {
    /** The ClientIdentifier provided by the Octopus variable Octopus.FeatureToggles.ClientIdentifier */
    clientIdentifier: string;

    /** Metadata about the application using the OpenFeature provider. Used to populate header for telemetry. */
    productMetadata: ProductMetadata;

    serverUri?: string;

    logger?: Logger;

    /** Overrides the application release version embedded in the ClientIdentifier */
    releaseVersionOverride?: string;
}
