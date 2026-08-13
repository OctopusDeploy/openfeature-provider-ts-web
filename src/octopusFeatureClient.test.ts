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

    test("Should invoke the v4 feature flag evaluations endpoint", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new OctopusFeatureClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("TestClient"),
        });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].url).toMatch(/\/feature-flags\/evaluations\/v4\/$/);
    });

    test("Should include releaseVersionOverride in HTTP header if provided in configuration", async () => {
        const releaseVersionOverride = "1.2.3";
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new OctopusFeatureClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("TestClient"),
            releaseVersionOverride,
        });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].headers!["X-Release-Version"]).toEqual(releaseVersionOverride);
    });

    test("Should include X-Octopus-Client header with product name only", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new OctopusFeatureClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("MyProduct"),
        });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual(`MyProduct openfeature-provider-ts-web/${PROVIDER_VERSION}`);
    });

    test("Should include X-Octopus-Client header with product name and version", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new OctopusFeatureClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("MyProduct", "2024.1.0"),
        });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual(`MyProduct/2024.1.0 openfeature-provider-ts-web/${PROVIDER_VERSION}`);
    });

    test("Should strip unsupported chars from product name in X-Octopus-Client header", async () => {
        mockAdapter.onGet().reply(200, [], { ContentHash: "aGFzaA==" });
        const client = new OctopusFeatureClient({
            clientIdentifier: "a.b.c",
            productMetadata: new ProductMetadata("My Product"),
        });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].headers!["X-Octopus-Client"]).toEqual(`MyProduct openfeature-provider-ts-web/${PROVIDER_VERSION}`);
    });

    describe("the manifest cache", () => {
        // jest-localstorage-mock's getItem/setItem close over instance state via jest.fn(impl), which
        // jest.config.js's resetMocks strips before every test. A plain in-memory Storage sidesteps
        // that entirely, since resetMocks only touches mocks it created.
        beforeEach(() => {
            const store = new Map<string, string>();
            global.localStorage = {
                getItem: (key) => (store.has(key) ? store.get(key)! : null),
                setItem: (key, value) => {
                    store.set(key, String(value));
                },
                removeItem: (key) => {
                    store.delete(key);
                },
                clear: () => {
                    store.clear();
                },
                key: (index) => Array.from(store.keys())[index] ?? null,
                get length() {
                    return store.size;
                },
            };
        });

        function newClient(): OctopusFeatureClient {
            return new OctopusFeatureClient({ clientIdentifier: "a.b.c", productMetadata: new ProductMetadata("TestClient") });
        }

        function cachedManifest(): unknown {
            return JSON.parse(localStorage.getItem("octopus-openfeature-ts-feature-manifest")!);
        }

        test("Writes a v3 cache entry after a successful fetch", async () => {
            mockAdapter.onGet().reply(200, [{ slug: "my-feature", value: true, reason: "The flag is enabled for this environment." }], {
                ContentHash: "aGFzaA==",
            });

            await newClient().getEvaluationContext();

            expect(cachedManifest()).toEqual({
                schemaVersion: "v3",
                contents: { evaluations: [{ slug: "my-feature", value: true, reason: "The flag is enabled for this environment." }], contentHash: "aGFzaA==" },
            });
        });

        test("Evaluates against the flags returned by a successful fetch", async () => {
            mockAdapter.onGet().reply(200, [{ slug: "my-feature", value: true, reason: "The flag is enabled for this environment." }], {
                ContentHash: "aGFzaA==",
            });

            const context = await newClient().getEvaluationContext();

            expect(context.evaluate("my-feature", {})).toEqual({ value: true, reason: "The flag is enabled for this environment." });
        });

        test("Falls back to a cached v3 entry when the fetch does not return a manifest", async () => {
            // No ContentHash header, so getFeatureManifest() reports no manifest without retrying.
            mockAdapter.onGet().reply(200, []);
            localStorage.setItem(
                "octopus-openfeature-ts-feature-manifest",
                JSON.stringify({
                    schemaVersion: "v3",
                    contents: {
                        evaluations: [{ slug: "cached-feature", value: true, reason: "The flag is enabled for this environment." }],
                        contentHash: "cached-hash",
                    },
                })
            );

            const context = await newClient().getEvaluationContext();

            expect(context.evaluate("cached-feature", {})).toEqual({ value: true, reason: "The flag is enabled for this environment." });
        });

        test("Treats a cache entry from a previous schema version as a miss and removes it", async () => {
            mockAdapter.onGet().reply(200, []);
            localStorage.setItem(
                "octopus-openfeature-ts-feature-manifest",
                JSON.stringify({ schemaVersion: "v2", contents: { evaluations: [], contentHash: "cached-hash" } })
            );

            const context = await newClient().getEvaluationContext();

            expect(context.findToggleBySlug("anything")).toBeUndefined();
            expect(localStorage.getItem("octopus-openfeature-ts-feature-manifest")).toBeNull();
        });

        test("Falls back to an empty context when there is no cache entry at all", async () => {
            mockAdapter.onGet().reply(200, []);

            const context = await newClient().getEvaluationContext();

            expect(context.findToggleBySlug("anything")).toBeUndefined();
        });

        test("Falls back to an empty context when the cache entry is not valid JSON", async () => {
            mockAdapter.onGet().reply(200, []);
            localStorage.setItem("octopus-openfeature-ts-feature-manifest", "not json");

            const context = await newClient().getEvaluationContext();

            expect(context.findToggleBySlug("anything")).toBeUndefined();
        });
    });
});
