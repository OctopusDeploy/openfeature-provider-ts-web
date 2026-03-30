import * as fs from "fs";
import * as path from "path";
import { OpenFeature, EvaluationContext, ErrorCode } from "@openfeature/web-sdk";
import { OctopusFeatureProvider } from "../octopusFeatureProvider";
import { V1FeatureToggleEvaluation } from "../octopusFeatureContext";
import { Server } from "./server";

interface Case {
    description: string;
    configuration: {
        slug: string;
        defaultValue: boolean;
        context?: Record<string, string>;
    };
    expected: {
        value: boolean;
        errorCode?: ErrorCode;
    };
}

interface Fixture {
    response: V1FeatureToggleEvaluation[];
    cases: Case[];
}

interface TestEntry {
    responseJson: string;
    testCase: Case;
}

function loadTestCases(): TestEntry[] {
    const fixturesDir = path.join(__dirname, "../../specification/Fixtures");
    const testCases: TestEntry[] = [];

    const fixtureFiles = fs.readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));
    for (const file of fixtureFiles) {
        const json = fs.readFileSync(path.join(fixturesDir, file), "utf-8");
        const fixture: Fixture = JSON.parse(json);
        const responseJson = JSON.stringify(fixture.response);

        for (const c of fixture.cases) {
            testCases.push({ responseJson, testCase: c });
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

test.each(testCases)("$testCase.description", async ({ responseJson, testCase }) => {
    const token = server.configure(responseJson);
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
