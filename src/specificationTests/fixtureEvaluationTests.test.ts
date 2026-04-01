import * as fs from "fs";
import * as path from "path";
import { ErrorCode } from "@openfeature/core";
import { OpenFeature } from "@openfeature/web-sdk";
import { OctopusFeatureProvider } from "../octopusFeatureProvider";
import { Server } from "./server";

interface Fixture {
    response: unknown;
    cases: Case[];
}

interface TestEntry {
    testResponse: string;
    testCase: Case;
}

interface Case {
    description: string;
    configuration: Configuration;
    expected: Expected;
}

interface Configuration {
    slug: string;
    defaultValue: boolean;
    context?: Record<string, string>;
}

interface Expected {
    value: boolean;
    errorCode?: ErrorCode;
}

function loadTestCases(): TestEntry[] {
    const fixturesDir = path.join(__dirname, "../../specification/Fixtures");
    const testCases: TestEntry[] = [];

    const fixtureFiles = fs.readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));
    for (const file of fixtureFiles) {
        const json = fs.readFileSync(path.join(fixturesDir, file), "utf-8");
        // Unlike in the other client libraries, we parse and re-serialize here.
        const fixture: Fixture = JSON.parse(json);
        const testResponse = JSON.stringify(fixture.response);

        for (const c of fixture.cases) {
            testCases.push({ testResponse, testCase: c });
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

// Requires `specification` submodule to be initialized.
test.each(testCases)("$testCase.description", async ({ testResponse, testCase }) => {
    const token = server.configure(testResponse);
    const provider = new OctopusFeatureProvider({
        clientIdentifier: token,
        serverUri: server.url,
    });

    await OpenFeature.setProviderAndWait(provider);
    await OpenFeature.setContext(testCase.configuration.context ?? {});

    const result = OpenFeature.getClient().getBooleanDetails(testCase.configuration.slug, testCase.configuration.defaultValue);

    expect(result.value).toBe(testCase.expected.value);
    expect(result.errorCode).toBe(testCase.expected.errorCode);
});
