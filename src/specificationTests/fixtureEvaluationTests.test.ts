import * as fs from "fs";
import * as path from "path";
import { OpenFeature, EvaluationContext } from "@openfeature/web-sdk";
import { OctopusFeatureProvider } from "../octopusFeatureProvider";
import { Server } from "./server";

interface FixtureCase {
    description: string;
    configuration: {
        slug: string;
        defaultValue: boolean;
        context?: Record<string, string>;
    };
    expected: {
        value: boolean;
        errorCode?: string;
    };
}

interface Fixture {
    response: unknown;
    cases: FixtureCase[];
}

interface SpecTestCase {
    description: string;
    responseJson: string;
    slug: string;
    defaultValue: boolean;
    context: EvaluationContext;
    expectedValue: boolean;
    expectedErrorCode?: string;
}

function loadTestCases(): SpecTestCase[] {
    const fixturesDir = path.join(__dirname, "../../specification/Fixtures");
    const testCases: SpecTestCase[] = [];

    const fixtureFiles = fs.readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));
    for (const file of fixtureFiles) {
        const json = fs.readFileSync(path.join(fixturesDir, file), "utf-8");
        const fixture: Fixture = JSON.parse(json);
        const responseJson = JSON.stringify(fixture.response);

        for (const c of fixture.cases) {
            testCases.push({
                description: c.description,
                responseJson,
                slug: c.configuration.slug,
                defaultValue: c.configuration.defaultValue,
                context: c.configuration.context ?? {},
                expectedValue: c.expected.value,
                expectedErrorCode: c.expected.errorCode,
            });
        }
    }

    return testCases;
}

const testCases = loadTestCases();
const server = new Server();

beforeAll(async () => {
    await server.start();
});

afterAll(async () => {
    await server.stop();
});

beforeEach(() => {
    localStorage.clear();
});

test.each(testCases)("$description", async ({ responseJson, slug, defaultValue, context, expectedValue, expectedErrorCode }) => {
    const token = server.configure(responseJson);
    const provider = new OctopusFeatureProvider({
        clientIdentifier: token,
        serverUri: server.url,
    });

    await OpenFeature.setProviderAndWait(provider, context);

    const result = OpenFeature.getClient().getBooleanDetails(slug, defaultValue);

    expect(result.value).toBe(expectedValue);
    expect(result.errorCode).toBe(expectedErrorCode);
});
