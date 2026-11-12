import { Logger, ProviderNotReadyError } from "@openfeature/server-sdk";
import { FeatureFlagApiClient, FeatureFlagEvaluator, parseEvaluationResponse } from "@octopusdeploy/openfeature-core";

// setTimeout fires almost at once for any delay it can't hold, which would turn polling into a busy loop.
const maxTimerDelayMs = 2 ** 31 - 1;

/** @internal */
export interface FeatureFlagEvaluatorCacheOptions {
    client: FeatureFlagApiClient;
    cacheDurationMs: number;
    logger: Logger;
    /** Called when a refresh gets evaluations after initialization got none, so the provider can leave ERROR. */
    onRecovered: () => void;
}

/**
 * Establishes and maintains the evaluator the server provider evaluates against, refreshing it whenever the Feature
 * Flags service reports the flags have changed. The counterpart of the .NET provider's FeatureFlagEvaluatorCache.
 *
 * @internal
 */
export class FeatureFlagEvaluatorCache {
    private readonly client: FeatureFlagApiClient;
    private readonly cacheDurationMs: number;
    private readonly logger: Logger;
    private readonly onRecovered: () => void;
    private evaluator: FeatureFlagEvaluator | undefined;

    // Replaced each time the cache initializes, so a refresh from an earlier start can't outlive shutdown.
    private polling: AbortController | undefined;
    private refreshTimer: ReturnType<typeof setTimeout> | undefined;
    private refreshInFlight: Promise<void> | undefined;

    constructor(options: FeatureFlagEvaluatorCacheOptions) {
        const { cacheDurationMs } = options;
        if (!Number.isFinite(cacheDurationMs) || cacheDurationMs <= 0 || cacheDurationMs > maxTimerDelayMs) {
            throw new RangeError(`cacheDurationMs must be greater than 0 and at most ${maxTimerDelayMs}, but was ${cacheDurationMs}.`);
        }
        this.client = options.client;
        this.cacheDurationMs = cacheDurationMs;
        this.logger = options.logger;
        this.onRecovered = options.onRecovered;
    }

    /** Undefined until a fetch has succeeded. */
    getEvaluator(): FeatureFlagEvaluator | undefined {
        return this.evaluator;
    }

    /**
     * Fetches the evaluations and starts polling. Polling starts even when the fetch fails, so the cache recovers once
     * the server is reachable.
     *
     * @throws {ProviderNotReadyError} when the server returned nothing usable.
     */
    async initialize(): Promise<void> {
        // The SDK initializes a provider again when it is set after being removed. Evaluations from the earlier start
        // must not outlive a fetch that fails this time.
        this.evaluator = undefined;
        this.stopPolling();
        const polling = new AbortController();
        this.polling = polling;

        try {
            this.evaluator = await this.fetchEvaluator(polling.signal);
        } finally {
            this.scheduleRefresh(polling.signal);
        }
    }

    /** Aborts any refresh in flight, stops polling, and waits for that refresh to settle. */
    async shutdown(): Promise<void> {
        this.stopPolling();
        await this.refreshInFlight;
    }

    private stopPolling(): void {
        this.polling?.abort();
        this.polling = undefined;
        clearTimeout(this.refreshTimer);
        this.refreshTimer = undefined;
    }

    /**
     * Waits a full interval after each refresh finishes, rather than firing on a fixed beat, so a slow server can never
     * have two refreshes in flight at once.
     */
    private scheduleRefresh(signal: AbortSignal): void {
        if (signal.aborted) {
            return;
        }

        this.refreshTimer = setTimeout(() => {
            const refresh = this.refresh(signal).finally(() => {
                if (this.refreshInFlight === refresh) {
                    this.refreshInFlight = undefined;
                }
                this.scheduleRefresh(signal);
            });
            this.refreshInFlight = refresh;
        }, this.cacheDurationMs);

        // Polling must never be the thing that keeps a Node process alive.
        this.refreshTimer.unref();
    }

    /**
     * Never rejects: a failed refresh keeps the evaluations already held, and the next one tries again. It never gives
     * up while the provider is open, so the flags are not left stale for good.
     */
    private async refresh(signal: AbortSignal): Promise<void> {
        const current = this.evaluator;

        try {
            // With nothing held yet there is nothing to compare, so go straight to fetching.
            if (current && !(await this.client.haveFeaturesChanged(current.contentHash, signal))) {
                return;
            }

            const next = await this.fetchEvaluator(signal);
            if (signal.aborted) {
                return;
            }

            this.evaluator = next;

            if (!current) {
                this.onRecovered();
            }
        } catch (error) {
            if (signal.aborted) {
                return;
            }
            this.logger.error("Failed to retrieve updated feature flag evaluations. Retaining the existing evaluations, which may be stale.", error);
        }
    }

    /**
     * There is no cache to fall back to: this already holds the evaluations it fetched, and falling back to evaluations
     * from an earlier start would let a failed fetch quietly serve them.
     *
     * @throws {ProviderNotReadyError} when the server returned nothing usable.
     */
    private async fetchEvaluator(signal: AbortSignal): Promise<FeatureFlagEvaluator> {
        const raw = await this.client.getServerSideEvaluations(signal);
        if (raw === undefined) {
            throw new ProviderNotReadyError("Unable to retrieve feature flags.");
        }
        return new FeatureFlagEvaluator(parseEvaluationResponse(raw), this.logger);
    }
}
