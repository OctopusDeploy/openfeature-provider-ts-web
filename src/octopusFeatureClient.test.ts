import { OctopusFeatureClient } from "./octopusFeatureClient";
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

    test("Should invoke the v3 endpoint", async () => {
        mockAdapter.onGet().reply(200, {});
        const client = new OctopusFeatureClient({ clientIdentifier: "a.b.c" });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].url).toMatch(/\/featuretoggles\/v3\/$/);
    });

    test("Should include releaseVersionOverride in HTTP header if provided in configuration", async () => {
        const releaseVersionOverride = "1.2.3";
        mockAdapter.onGet().reply(200, {});
        const client = new OctopusFeatureClient({ clientIdentifier: "a.b.c", releaseVersionOverride });

        await client.getEvaluationContext();

        expect(mockAdapter.history.get[0].headers!["X-Release-Version"]).toEqual(releaseVersionOverride);
    });
});
