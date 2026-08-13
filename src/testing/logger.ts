import { Logger } from "@openfeature/web-sdk";

/** A Logger stub for tests that need one to construct a provider or context but don't assert on it. */
export function silentLogger(): Logger {
    return { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
}
