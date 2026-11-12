import { Logger } from "@openfeature/web-sdk";
import type { RawEvaluationResponse } from "@octopusdeploy/openfeature-core";
import type { EvaluationCache } from "./evaluationCache.js";

interface EvaluationCacheEntry {
    // Note: This counts cache shapes, not endpoint or manifest versions.
    cacheSchemaVersion: 3;
    contents: RawEvaluationResponse;
}

const localStorageKey = "octopus-openfeature-ts-feature-manifest";

/** @internal */
export class LocalStorageCache implements EvaluationCache {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    read(): RawEvaluationResponse | undefined {
        try {
            const rawCache = localStorage.getItem(localStorageKey);
            if (rawCache === null) {
                return undefined;
            }

            const cacheEntry = JSON.parse(rawCache);
            if (isCurrentCacheEntry(cacheEntry)) {
                return cacheEntry.contents;
            }

            // The cached entry is from an old cache schema version.
            localStorage.removeItem(localStorageKey);
        } catch (e) {
            this.logger.warn("Failed to read cached feature flag evaluations.", e);
        }

        return undefined;
    }

    write(raw: RawEvaluationResponse): void {
        const cacheEntry: EvaluationCacheEntry = { cacheSchemaVersion: 3, contents: raw };
        try {
            localStorage.setItem(localStorageKey, JSON.stringify(cacheEntry));
        } catch (e) {
            // A full or unavailable local storage costs us the fallback on the next page load, but the evaluations we
            // just fetched are still good, so this must not fail initialization.
            this.logger.warn("Failed to cache feature flag evaluations.", e);
        }
    }
}

function isCurrentCacheEntry(entry: unknown): entry is EvaluationCacheEntry {
    const possibleCacheEntry = entry as EvaluationCacheEntry;
    return (
        possibleCacheEntry.cacheSchemaVersion === 3 &&
        possibleCacheEntry.contents !== undefined &&
        possibleCacheEntry.contents.evaluations !== undefined &&
        possibleCacheEntry.contents.contentHash !== undefined
    );
}
