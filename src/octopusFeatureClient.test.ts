import { OctopusFeatureClient } from "./octopusFeatureClient";
import { ProductMetadata } from "./productMetadata";
import { PROVIDER_VERSION } from "./version";
import axios from "axios";
import axiosRetry from "axios-retry";
import MockAdapter from "axios-mock-adapter";

axiosRetry(axios, { retries: 3 });

describe("OctopusFeatureClient", () => {
    let mockAdapter: MockAdapter;
    beforeEach(() => {
        localStorage.clear();
    });

    beforeAll(() => {
        mockAdapter = new MockAdapter(axios);
    });

    afterEach(() => {
        mockAdapter.reset();
    });

    test("Should invoke the toggles evaluations v3 endpoint", async () => {
        mockAdapter.onGet().reply(200, {});
        const client = new OctopusFeatureClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("TestClient"),
        });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].url).toMatch(/\/toggles\/evaluations\/v3\/$/);
    });

    test("Should include releaseVersionOverride in HTTP header if provided in configuration", async () => {
        const releaseVersionOverride = "1.2.3";
        mockAdapter.onGet().reply(200, {});
        const client = new OctopusFeatureClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("TestClient"),
            releaseVersionOverride,
        });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].headers!["X-Release-Version"]).toEqual(releaseVersionOverride);
    });

    test("Should include X-Octopus-Client header with product name only", async () => {
        mockAdapter.onGet().reply(200, {});
        const client = new OctopusFeatureClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("MyProduct"),
        });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual(
            `MyProduct openfeature-provider-ts-web/${PROVIDER_VERSION}`
        );
    });

    test("Should include X-Octopus-Client header with product name and version", async () => {
        mockAdapter.onGet().reply(200, {});
        const client = new OctopusFeatureClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("MyProduct", "2024.1.0"),
        });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual(
            `MyProduct/2024.1.0 openfeature-provider-ts-web/${PROVIDER_VERSION}`
        );
    });

    test("Should strip unsupported chars from product name in X-Octopus-Client header", async () => {
        mockAdapter.onGet().reply(200, {});
        const client = new OctopusFeatureClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("My Product"),
        });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual(
            `MyProduct openfeature-provider-ts-web/${PROVIDER_VERSION}`
        );
    });
});
