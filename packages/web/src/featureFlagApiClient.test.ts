import { EvaluationCache, RawEvaluationResponse } from "./evaluationCache.js";
import { FeatureFlagApiClient } from "./featureFlagApiClient.js";
import { ProductMetadata } from "./productMetadata.js";
import { silentLogger } from "./testing/logger.js";
import axios from "axios";
import axiosRetry from "axios-retry";
import MockAdapter from "axios-mock-adapter";
import { ProviderNotReadyError } from "@openfeature/web-sdk";

axiosRetry(axios, { retries: 3 });

const testProviderMetadata = { name: "test-provider", version: "1.2.3" };

class FakeCache implements EvaluationCache {
    written: RawEvaluationResponse | undefined;

    constructor(private readonly entry?: RawEvaluationResponse) {}

    read(): RawEvaluationResponse | undefined {
        return this.entry;
    }

    write(raw: RawEvaluationResponse): void {
        this.written = raw;
    }
}

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
            cache: new FakeCache(),
        });

        await client.getEvaluator();

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
            cache: new FakeCache(),
            releaseVersionOverride,
        });

        await client.getEvaluator();

        expect(mockAdapter.history.get[0].headers!["X-Release-Version"]).toEqual(releaseVersionOverride);
    });

    test("Should include X-Octopus-Client header with product name only", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new FeatureFlagApiClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("MyProduct"),
            logger: silentLogger(),
            providerMetadata: testProviderMetadata,
            cache: new FakeCache(),
        });

        await client.getEvaluator();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual("MyProduct test-provider/1.2.3");
    });

    test("Should include X-Octopus-Client header with product name and version", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new FeatureFlagApiClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("MyProduct", "2024.1.0"),
            logger: silentLogger(),
            providerMetadata: testProviderMetadata,
            cache: new FakeCache(),
        });

        await client.getEvaluator();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual("MyProduct/2024.1.0 test-provider/1.2.3");
    });

    test("Should strip unsupported chars from product name in X-Octopus-Client header", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new FeatureFlagApiClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("My Product"),
            logger: silentLogger(),
            providerMetadata: testProviderMetadata,
            cache: new FakeCache(),
        });

        await client.getEvaluator();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual("MyProduct test-provider/1.2.3");
    });

    describe("the evaluation cache", () => {
        const cachedEntry: RawEvaluationResponse = {
            evaluations: [{ slug: "cached-feature", value: true, reason: "The flag is enabled for this environment." }],
            contentHash: "cached-hash",
        };

        function newClient(cache: EvaluationCache): FeatureFlagApiClient {
            return new FeatureFlagApiClient({
                clientIdentifier: "a.b.c",
                productMetadata: new ProductMetadata("TestClient"),
                logger: silentLogger(),
                providerMetadata: testProviderMetadata,
                cache,
            });
        }

        test("Writes the fetched evaluations to the cache", async () => {
            mockAdapter.onGet().reply(200, [{ slug: "my-feature", value: true, reason: "The flag is enabled for this environment." }], {
                ContentHash: "aGFzaA==",
            });
            const cache = new FakeCache();

            await newClient(cache).getEvaluator();

            expect(cache.written).toEqual({
                evaluations: [{ slug: "my-feature", value: true, reason: "The flag is enabled for this environment." }],
                contentHash: "aGFzaA==",
            });
        });

        test("Evaluates against the flags returned by a successful fetch", async () => {
            mockAdapter.onGet().reply(200, [{ slug: "my-feature", value: true, reason: "The flag is enabled for this environment." }], {
                ContentHash: "aGFzaA==",
            });

            const context = await newClient(new FakeCache(cachedEntry)).getEvaluator();

            expect(context.evaluate("my-feature", {})).toEqual({ value: true, reason: "The flag is enabled for this environment." });
        });

        describe.each([
            ["the response has no ContentHash header", () => mockAdapter.onGet().reply(200, [])],
            ["the server cannot be reached", () => mockAdapter.onGet().networkError()],
            ["the flags are not found", () => mockAdapter.onGet().reply(404)],
            ["the server keeps failing", () => mockAdapter.onGet().reply(500)],
        ])("when %s", (_, arrangeResponse) => {
            beforeEach(() => arrangeResponse());

            test("Falls back to the cached entry", async () => {
                const context = await newClient(new FakeCache(cachedEntry)).getEvaluator();

                expect(context.evaluate("cached-feature", {})).toEqual({ value: true, reason: "The flag is enabled for this environment." });
            });

            test("Leaves the cache as it is", async () => {
                const cache = new FakeCache(cachedEntry);

                await newClient(cache).getEvaluator();

                expect(cache.written).toBeUndefined();
            });

            // An evaluator holding an empty list of evaluations answers every lookup with FlagNotFoundError, which
            // evaluates the same as a misspelled slug. Rejecting instead keeps an outage distinguishable from a typo.
            test("Rejects when there is no cached entry", async () => {
                await expect(newClient(new FakeCache()).getEvaluator()).rejects.toThrow(ProviderNotReadyError);
            });
        });
    });
});
