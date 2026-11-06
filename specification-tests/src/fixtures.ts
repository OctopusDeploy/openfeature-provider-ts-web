import * as fs from "fs";
import * as path from "path";

// The specification submodule lives at the repository root.
export const fixturesDirectory = path.resolve(__dirname, "../../specification/Fixtures");

export interface FixtureCase {
    /** The v4 evaluations response body the test server returns for this case. */
    responseJson: string;
    description: string;
    configuration: FixtureConfiguration;
    expected: FixtureEvaluationResult;
}

export interface FixtureConfiguration {
    slug: string;
    defaultValue: boolean;
    context?: Record<string, string | null>;
}

/**
 * The parts of an OpenFeature evaluation details result that the fixtures check. Used both for a case's
 * expected result and for what a provider returns, so the two can't drift apart.
 */
export interface FixtureEvaluationResult {
    value: boolean;
    reason?: string;
    errorCode?: string;
}

interface Fixture {
    response: unknown;
    cases: Omit<FixtureCase, "responseJson">[];
}

export function loadFixtureCases(): FixtureCase[] {
    const cases: FixtureCase[] = [];

    const fixtureFiles = fs.readdirSync(fixturesDirectory).filter((f) => f.endsWith(".json"));
    for (const file of fixtureFiles) {
        const json = fs.readFileSync(path.join(fixturesDirectory, file), "utf-8");
        const fixture: Fixture = JSON.parse(json);

        // Unlike in the other client libraries, we can safely parse and re-serialize here.
        const responseJson = JSON.stringify(fixture.response);

        for (const c of fixture.cases) {
            cases.push({ responseJson, ...c });
        }
    }
    return cases;
}
