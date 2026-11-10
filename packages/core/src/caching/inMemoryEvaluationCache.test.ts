import { InMemoryEvaluationCache } from "./inMemoryEvaluationCache.js";

const raw = { evaluations: [{ slug: "my-feature", value: true }], contentHash: "aGFzaA==" };

describe("InMemoryEvaluationCache", () => {
    test("Has no entry before anything is written", () => {
        expect(new InMemoryEvaluationCache().read()).toBeUndefined();
    });

    test("Reads back what was written", () => {
        const cache = new InMemoryEvaluationCache();

        cache.write(raw);

        expect(cache.read()).toEqual(raw);
    });

    test("Replaces the entry on each write", () => {
        const cache = new InMemoryEvaluationCache();
        const newer = { evaluations: [{ slug: "other-feature", value: false }], contentHash: "bmV3ZXI=" };

        cache.write(raw);
        cache.write(newer);

        expect(cache.read()).toEqual(newer);
    });

    test("Keeps each instance's entry to itself", () => {
        const written = new InMemoryEvaluationCache();
        const other = new InMemoryEvaluationCache();

        written.write(raw);

        expect(other.read()).toBeUndefined();
    });
});
