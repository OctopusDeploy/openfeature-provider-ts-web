import { FeatureFlagApiClient } from "./featureFlagApiClient.js";
import { silentLogger } from "../testing/logger.js";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { ProductMetadata } from "../configuration/productMetadata.js";

const testProviderMetadata = { name: "test-provider", version: "1.2.3" };

describe("FeatureFlagApiClient", () => {
    let mockAdapter: MockAdapter;

    beforeAll(() => {
        mockAdapter = new MockAdapter(axios);
    });

    afterEach(() => {
        mockAdapter.reset();
    });

    test("Should invoke the v4 feature flag evaluations endpoint", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new FeatureFlagApiClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("TestClient"),
            logger: silentLogger(),
            providerMetadata: testProviderMetadata,
        });

        await client.getServerSideEvaluations();

        expect(mockAdapter.history.get[0].url).toMatch(/\/feature-flags\/evaluations\/v4\/$/);
    });

    test("Should include releaseVersionOverride in HTTP header if provided in configuration", async () => {
        const releaseVersionOverride = "1.2.3";
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new FeatureFlagApiClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("TestClient"),
            logger: silentLogger(),
            providerMetadata: testProviderMetadata,
            releaseVersionOverride,
        });

        await client.getServerSideEvaluations();

        expect(mockAdapter.history.get[0].headers!["X-Release-Version"]).toEqual(releaseVersionOverride);
    });

    test("Should include X-Octopus-Client header with product name only", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new FeatureFlagApiClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("MyProduct"),
            logger: silentLogger(),
            providerMetadata: testProviderMetadata,
        });

        await client.getServerSideEvaluations();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual("MyProduct test-provider/1.2.3");
    });

    test("Should include X-Octopus-Client header with product name and version", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new FeatureFlagApiClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("MyProduct", "2024.1.0"),
            logger: silentLogger(),
            providerMetadata: testProviderMetadata,
        });

        await client.getServerSideEvaluations();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual("MyProduct/2024.1.0 test-provider/1.2.3");
    });

    test("Should strip unsupported chars from product name in X-Octopus-Client header", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new FeatureFlagApiClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("My Product"),
            logger: silentLogger(),
            providerMetadata: testProviderMetadata,
        });

        await client.getServerSideEvaluations();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual("MyProduct test-provider/1.2.3");
    });

    describe("fetching the evaluations", () => {
        function newClient(): FeatureFlagApiClient {
            return new FeatureFlagApiClient({
                clientIdentifier: "a.b.c",
                productMetadata: new ProductMetadata("TestClient"),
                logger: silentLogger(),
                providerMetadata: testProviderMetadata,
            });
        }

        test("Resolves to the evaluations and content hash exactly as received", async () => {
            mockAdapter.onGet().reply(200, [{ slug: "my-feature", value: true, reason: "The flag is enabled for this environment." }], {
                ContentHash: "aGFzaA==",
            });

            await expect(newClient().getServerSideEvaluations()).resolves.toEqual({
                evaluations: [{ slug: "my-feature", value: true, reason: "The flag is enabled for this environment." }],
                contentHash: "aGFzaA==",
            });
        });

        test.each([
            ["the response has no ContentHash header", () => mockAdapter.onGet().reply(200, [])],
            ["the server cannot be reached", () => mockAdapter.onGet().networkError()],
            ["the flags are not found", () => mockAdapter.onGet().reply(404)],
            ["the server keeps failing", () => mockAdapter.onGet().reply(500)],
        ])("Resolves to undefined when %s", async (_, arrangeResponse) => {
            arrangeResponse();

            await expect(newClient().getServerSideEvaluations()).resolves.toBeUndefined();
        });
    });

    describe("checking whether the features have changed", () => {
        const checkUrl = /\/api\/feature-flags\/check\/v4\/$/;

        function newClient(releaseVersionOverride?: string): FeatureFlagApiClient {
            return new FeatureFlagApiClient({
                clientIdentifier: "a.b.c",
                productMetadata: new ProductMetadata("TestClient"),
                logger: silentLogger(),
                providerMetadata: testProviderMetadata,
                releaseVersionOverride,
            });
        }

        test("Invokes the v4 check endpoint with the same headers as the evaluations request", async () => {
            mockAdapter.onGet(checkUrl).reply(200, { contentHash: "aGFzaA==" });

            await newClient("1.2.3").haveFeaturesChanged("aGFzaA==");

            const request = mockAdapter.history.get[0];
            expect(request.url).toMatch(checkUrl);
            expect(request.headers!["Authorization"]).toEqual("Bearer a.b.c");
            expect(request.headers!["X-Octopus-Client"]).toEqual("TestClient test-provider/1.2.3");
            expect(request.headers!["X-Release-Version"]).toEqual("1.2.3");
        });

        test("Reports no change when the server returns the same content hash", async () => {
            mockAdapter.onGet(checkUrl).reply(200, { contentHash: "aGFzaA==" });

            await expect(newClient().haveFeaturesChanged("aGFzaA==")).resolves.toBe(false);
        });

        test("Reports a change when the server returns a different content hash", async () => {
            mockAdapter.onGet(checkUrl).reply(200, { contentHash: "bmV3" });

            await expect(newClient().haveFeaturesChanged("aGFzaA==")).resolves.toBe(true);
        });

        test("Reports a change without asking the server when there is no content hash to compare", async () => {
            await expect(newClient().haveFeaturesChanged("")).resolves.toBe(true);

            expect(mockAdapter.history.get).toHaveLength(0);
        });

        test("Times out both requests, so one that never gets a response can't stall polling", async () => {
            mockAdapter.onGet(checkUrl).reply(200, { contentHash: "bmV3" });
            mockAdapter.onGet().reply(200, [], { ContentHash: "bmV3" });
            const client = newClient();

            await client.haveFeaturesChanged("aGFzaA==");
            await client.getServerSideEvaluations();

            expect(mockAdapter.history.get.map((request) => request.timeout)).toEqual([100_000, 100_000]);
        });

        // Rejecting, rather than reporting a change, lets the caller keep the evaluations it has instead of fetching
        // them again from a server that is already failing.
        test.each([
            ["the server cannot be reached", () => mockAdapter.onGet(checkUrl).networkError()],
            ["the server keeps failing", () => mockAdapter.onGet(checkUrl).reply(500)],
            ["the response has no content hash", () => mockAdapter.onGet(checkUrl).reply(200, {})],
            ["the response is not an object", () => mockAdapter.onGet(checkUrl).reply(200, "nope")],
        ])("Rejects when %s", async (_, arrangeResponse) => {
            arrangeResponse();

            await expect(newClient().haveFeaturesChanged("aGFzaA==")).rejects.toBeDefined();
        });
    });
});
