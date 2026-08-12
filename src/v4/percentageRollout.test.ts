import { rolloutVectors } from "../testing/rolloutVectors";
import { getNormalizedNumber, includes } from "./percentageRollout";

// The bucketing shared by the v3 and v4 evaluation paths. The vectors are duplicated verbatim across
// every provider library, so a divergence here is a divergence in who a rollout turns a flag on for.
describe("percentageRollout", () => {
    test.each(rolloutVectors)("getNormalizedNumber('%s', '%s') === %i", (evaluationKey, targetingKey, expected) => {
        expect(getNormalizedNumber(evaluationKey, targetingKey)).toBe(expected);
    });

    describe("includes", () => {
        // getNormalizedNumber("evaluation-key", "targeting-key") is 13, so the rollout either side of
        // that bucket pins the boundary.
        const evaluationKey = "evaluation-key";
        const targetingKey = "targeting-key";

        test("A targeting key inside the rollout is included", () => {
            expect(includes(evaluationKey, targetingKey, 13)).toBe(true);
        });

        test("A targeting key outside the rollout is excluded", () => {
            expect(includes(evaluationKey, targetingKey, 12)).toBe(false);
        });

        test("Nothing is included at 0%, as the lowest bucket is 1", () => {
            expect(includes(evaluationKey, targetingKey, 0)).toBe(false);
        });

        test("Everything is included at 100%, as the highest bucket is 100", () => {
            expect(includes(evaluationKey, targetingKey, 100)).toBe(true);
        });
    });
});
