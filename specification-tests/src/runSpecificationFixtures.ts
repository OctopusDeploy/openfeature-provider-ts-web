import { FixtureCase, FixtureEvaluationResult, fixturesDirectory, loadFixtureCases } from "./fixtures.js";
import { Server } from "./server.js";

/** What a provider needs to evaluate one fixture case against the test server. */
export interface FixtureEvaluationRequest {
    serverUri: string;
    /** Unique per case; the test server uses it to pick the response for this case. */
    clientIdentifier: string;
    slug: string;
    defaultValue: boolean;
    context: Record<string, string | null>;
}

export type EvaluateFixture = (request: FixtureEvaluationRequest) => Promise<FixtureEvaluationResult>;

/**
 * Registers one Jest test per specification fixture case. The harness owns case loading, the test server
 * and the assertions, so every provider runs exactly the same cases and is held to the same checks. The
 * caller only supplies how its SDK evaluates a boolean flag.
 */
export function runSpecificationFixtures(evaluate: EvaluateFixture): void {
    const cases = loadFixtureCases();
    if (cases.length === 0) {
        // test.each with an empty table would pass silently; is the specification submodule checked out?
        throw new Error(`No specification fixture cases found in ${fixturesDirectory}`);
    }

    const server = new Server();

    beforeAll(async () => {
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test.each(cases)("$description", async (testCase: FixtureCase) => {
        const result = await evaluate({
            serverUri: server.url,
            clientIdentifier: server.configure(testCase.responseJson),
            slug: testCase.configuration.slug,
            defaultValue: testCase.configuration.defaultValue,
            context: testCase.configuration.context ?? {},
        });

        expect(result.value).toBe(testCase.expected.value);
        expect(result.errorCode).toBe(testCase.expected.errorCode);
        if (testCase.expected.reason !== undefined) {
            expect(result.reason).toBe(testCase.expected.reason);
        }
    });
}
