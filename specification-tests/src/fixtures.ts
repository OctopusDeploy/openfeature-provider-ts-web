import * as fs from "fs";
import * as path from "path";

// The specification submodule lives at the repository root.
export const fixturesDirectory = path.resolve(__dirname, "../../specification/Fixtures");

export interface FixtureCase {
    /** The v4 evaluations response body the test server returns for this case. */
    responseJson: string;
    description: string;
    configuration: FixtureConfiguration;
    expected: FixtureExpectation;
}

export interface FixtureConfiguration {
    slug: string;
    defaultValue: boolean;
    context?: Record<string, string | null>;
}

export interface FixtureExpectation {
    value: boolean;
    reason?: string;
    errorCode?: string;
}

interface Fixture {
    response: unknown;
    cases: Omit<FixtureCase, "responseJson">[];
}

export function loadFixtureCases(directory: string = fixturesDirectory): FixtureCase[] {
    const cases: FixtureCase[] = [];

    const fixtureFiles = fs.readdirSync(directory).filter((f) => f.endsWith(".json"));
    for (const file of fixtureFiles) {
        const json = fs.readFileSync(path.join(directory, file), "utf-8");
        const fixture: Fixture = JSON.parse(json);

        // Unlike in the other client libraries, we can safely parse and re-serialize here.
        const responseJson = JSON.stringify(fixture.response);

        for (const c of fixture.cases) {
            cases.push({ responseJson, ...c });
        }
    }
    return cases;
}
