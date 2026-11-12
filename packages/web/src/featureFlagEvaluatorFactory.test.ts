import { ProviderNotReadyError } from "@openfeature/web-sdk";
import { EvaluationCache, FeatureFlagApiClient, RawEvaluationResponse } from "@octopusdeploy/openfeature-core";
import { silentLogger } from "../../core/src/testing/logger.js";
import { FeatureFlagEvaluatorFactory } from "./featureFlagEvaluatorFactory.js";

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

const fetched: RawEvaluationResponse = {
    evaluations: [{ slug: "my-feature", value: true, reason: "The flag is enabled for this environment." }],
    contentHash: "aGFzaA==",
};

const cachedEntry: RawEvaluationResponse = {
    evaluations: [{ slug: "cached-feature", value: true, reason: "The flag is enabled for this environment." }],
    contentHash: "cached-hash",
};

const clientReturning = (raw: RawEvaluationResponse | undefined) =>
    ({ getServerSideEvaluations: jest.fn().mockResolvedValue(raw) }) as unknown as FeatureFlagApiClient;

describe("FeatureFlagEvaluatorFactory", () => {
    describe("when the server returns evaluations", () => {
        test("Writes them to the cache", async () => {
            const cache = new FakeCache();

            await new FeatureFlagEvaluatorFactory(clientReturning(fetched), cache, silentLogger()).createEvaluator();

            expect(cache.written).toEqual(fetched);
        });

        test("Evaluates against them, not the cached entry", async () => {
            const evaluator = await new FeatureFlagEvaluatorFactory(clientReturning(fetched), new FakeCache(cachedEntry), silentLogger()).createEvaluator();

            expect(evaluator.evaluate("my-feature", {})).toEqual({ value: true, reason: "The flag is enabled for this environment." });
        });
    });

    describe("when the server returns nothing usable", () => {
        test("Falls back to the cached entry", async () => {
            const evaluator = await new FeatureFlagEvaluatorFactory(clientReturning(undefined), new FakeCache(cachedEntry), silentLogger()).createEvaluator();

            expect(evaluator.evaluate("cached-feature", {})).toEqual({ value: true, reason: "The flag is enabled for this environment." });
        });

        test("Leaves the cache as it is", async () => {
            const cache = new FakeCache(cachedEntry);

            await new FeatureFlagEvaluatorFactory(clientReturning(undefined), cache, silentLogger()).createEvaluator();

            expect(cache.written).toBeUndefined();
        });

        // An evaluator holding an empty list of evaluations answers every lookup with FlagNotFoundError, which
        // evaluates the same as a misspelled slug. Rejecting instead keeps an outage distinguishable from a typo.
        test("Rejects when there is no cached entry", async () => {
            await expect(new FeatureFlagEvaluatorFactory(clientReturning(undefined), new FakeCache(), silentLogger()).createEvaluator()).rejects.toThrow(
                ProviderNotReadyError
            );
        });
    });
});
