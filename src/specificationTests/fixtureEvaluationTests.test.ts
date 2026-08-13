import * as fs from "fs";
import * as path from "path";
import { ErrorCode } from "@openfeature/core";
import { OpenFeature } from "@openfeature/web-sdk";
import { OctopusFeatureProvider } from "../octopusFeatureProvider";
import { ProductMetadata } from "../productMetadata";
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
    // A null models a context attribute that is present but holds no string — distinct from an
    // attribute the caller left out entirely. A silent coercion here (stringifying it, or dropping the
    // key) would make the case-insensitivity and excluded-attribute fixtures pass for the wrong reason.
    context?: Record<string, string | null>;
}

interface Expected {
    value: boolean;
    // Only asserted when the fixture states one: 11 of the 83 cases carry an errorCode with no reason,
    // and the SDK populates its own "ERROR" reason for those once failures throw rather than return.
    reason?: string;
    errorCode?: ErrorCode;
}

function loadTestCases(): TestEntry[] {
    const fixturesDir = path.join(__dirname, "../../specification/Fixtures");
    const testCases: TestEntry[] = [];

    const fixtureFiles = fs.readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));
    for (const file of fixtureFiles) {
        const json = fs.readFileSync(path.join(fixturesDir, file), "utf-8");
        const fixture: Fixture = JSON.parse(json);

        // .NET forwards its response fixture unparsed via GetRawText(), to avoid a round-trip through
        // System.Text.Json's configurable (and stricter) serialiser. JSON.parse/JSON.stringify have no
        // equivalent configurable behaviour to drift from, and round-trip every response in this
        // repo's fixtures with identical values — confirmed by comparison, not assumed — so parsing and
        // re-serialising here loses only source formatting, never anything a test can observe.
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

test.each(testCases)("$testCase.description", async ({ testResponse, testCase }) => {
    const token = server.configure(testResponse);
    const provider = new OctopusFeatureProvider({
        clientIdentifier: token,
        serverUri: server.url,
        productMetadata: new ProductMetadata("TestClient"),
    });

    await OpenFeature.setProviderAndWait(provider);
    await OpenFeature.setContext(testCase.configuration.context ?? {});

    const result = OpenFeature.getClient().getBooleanDetails(testCase.configuration.slug, testCase.configuration.defaultValue);

    expect(result.value).toBe(testCase.expected.value);
    expect(result.errorCode).toBe(testCase.expected.errorCode);
    if (testCase.expected.reason !== undefined) {
        expect(result.reason).toBe(testCase.expected.reason);
    }
});
