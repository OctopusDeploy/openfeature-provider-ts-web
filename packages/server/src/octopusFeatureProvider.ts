import {
    DefaultLogger,
    EvaluationContext,
    FlagNotFoundError,
    JsonValue,
    Logger,
    OpenFeatureEventEmitter,
    Provider,
    ProviderEvents,
    ProviderNotReadyError,
    ResolutionDetails,
    TypeMismatchError,
} from "@openfeature/server-sdk";
import { EvaluationCache, FeatureFlagApiClient, FeatureFlagEvaluator } from "@octopusdeploy/openfeature-core";
import { OctopusFeatureConfiguration } from "./octopusFeatureConfiguration.js";
import { PROVIDER_VERSION } from "./version.js";

// The provider already holds the evaluations it fetched, so a cache adds nothing, and falling back to one would let a
// failed fetch quietly serve evaluations from an earlier start.
const noEvaluationCache: EvaluationCache = {
    read: () => undefined,
    write: () => undefined,
};

const defaultCacheDurationMs = 60_000;

// setTimeout fires almost at once for any delay it can't hold, which would turn polling into a busy loop.
const maxTimerDelayMs = 2 ** 31 - 1;

export class OctopusFeatureProvider implements Provider {
    private readonly client: FeatureFlagApiClient;
    private readonly logger: Logger;
    private readonly cacheDurationMs: number;
    private evaluator: FeatureFlagEvaluator | undefined;

    // Replaced each time the provider initializes, so a refresh from an earlier start can't outlive onClose.
    private polling: AbortController | undefined;
    private refreshTimer: ReturnType<typeof setTimeout> | undefined;
    private refreshInFlight: Promise<void> | undefined;

    constructor(configuration: OctopusFeatureConfiguration) {
        const cacheDurationMs = configuration.cacheDurationMs ?? defaultCacheDurationMs;
        if (!Number.isFinite(cacheDurationMs) || cacheDurationMs <= 0 || cacheDurationMs > maxTimerDelayMs) {
            throw new RangeError(`cacheDurationMs must be greater than 0 and at most ${maxTimerDelayMs}, but was ${cacheDurationMs}.`);
        }
        this.cacheDurationMs = cacheDurationMs;
        this.logger = configuration.logger ?? new DefaultLogger();
        this.client = new FeatureFlagApiClient({
            clientIdentifier: configuration.clientIdentifier,
            productMetadata: configuration.productMetadata,
            serverUri: configuration.serverUri,
            releaseVersionOverride: configuration.releaseVersionOverride,
            logger: this.logger,
            providerMetadata: { name: "openfeature-provider-ts-server", version: PROVIDER_VERSION },
            cache: noEvaluationCache,
        });
    }

    metadata = {
        name: "octopus-ts-server-provider",
    };

    readonly runsOn = "server";

    hooks = [];

    readonly events = new OpenFeatureEventEmitter();

    async initialize(): Promise<void> {
        // The SDK initializes a provider again when it is set after being removed. Evaluations from the earlier start
        // must not outlive a fetch that fails this time.
        this.evaluator = undefined;
        this.stopPolling();
        const polling = new AbortController();
        this.polling = polling;

        try {
            // A rejection moves the provider to ERROR and rejects setProviderAndWait, so the caller learns the flags are
            // unavailable instead of every slug quietly reading as FLAG_NOT_FOUND.
            this.evaluator = await this.client.getEvaluator(polling.signal);
        } finally {
            // Poll even when the first fetch failed, as the .NET and Java providers do, so the provider recovers once
            // the server is reachable rather than staying in ERROR until the process restarts.
            this.scheduleRefresh(polling.signal);
        }
    }

    async onClose(): Promise<void> {
        this.stopPolling();
        // Let a refresh that was already under way settle, so nothing it started is left running after close.
        await this.refreshInFlight;
    }

    // Server-side evaluation context arrives with every call, so one provider serves every request concurrently. The
    // evaluator is pure, so nothing about one request's context is kept for the next.
    async resolveBooleanEvaluation(flagKey: string, defaultValue: boolean, context: EvaluationContext): Promise<ResolutionDetails<boolean>> {
        return this.requireEvaluator().evaluate(flagKey, context);
    }

    async resolveStringEvaluation(flagKey: string, defaultValue: string): Promise<ResolutionDetails<string>> {
        return this.rejectNonBooleanEvaluation(flagKey);
    }

    async resolveNumberEvaluation(flagKey: string, defaultValue: number): Promise<ResolutionDetails<number>> {
        return this.rejectNonBooleanEvaluation(flagKey);
    }

    async resolveObjectEvaluation<U extends JsonValue>(flagKey: string, defaultValue: U): Promise<ResolutionDetails<U>> {
        return this.rejectNonBooleanEvaluation(flagKey);
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
     * Never rejects: a failed refresh keeps the evaluations already held, and the next one tries again. Like the .NET
     * and Java providers, it never gives up while the provider is open, so the flags are not left stale for good.
     */
    private async refresh(signal: AbortSignal): Promise<void> {
        const current = this.evaluator;

        try {
            // With nothing held yet there is nothing to compare, so go straight to fetching.
            if (current && !(await this.client.haveFeaturesChanged(current.contentHash, signal))) {
                return;
            }

            const next = await this.client.getEvaluator(signal);
            if (signal.aborted) {
                return;
            }

            this.evaluator = next;

            // Initialization failed, so the SDK has the provider in ERROR. Ready moves it back now flags are available.
            if (!current) {
                this.events.emit(ProviderEvents.Ready);
            }
        } catch (error) {
            if (signal.aborted) {
                return;
            }
            this.logger.error("Failed to retrieve updated feature flag evaluations. Retaining the existing evaluations, which may be stale.", error);
        }
    }

    private rejectNonBooleanEvaluation(flagKey: string): never {
        if (!this.requireEvaluator().findEvaluationBySlug(flagKey)) {
            throw new FlagNotFoundError(flagKey);
        }
        throw new TypeMismatchError("Octopus only supports boolean flags.");
    }

    /**
     * Without any evaluations we cannot tell an unknown slug from one we simply never received, so every evaluation
     * reports PROVIDER_NOT_READY instead of masking the outage as FLAG_NOT_FOUND.
     */
    private requireEvaluator(): FeatureFlagEvaluator {
        if (!this.evaluator) {
            throw new ProviderNotReadyError("No Octopus feature flags are available. The provider failed to initialize, or was used before initializing.");
        }
        return this.evaluator;
    }
}
