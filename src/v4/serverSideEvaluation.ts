import { ClientSideRule } from "./clientSideRule";

/**
 * A single feature flag as returned by the Feature Flags service v4 evaluations endpoint. The
 * endpoint returns an array of these.
 *
 * A flag is returned in one of two shapes:
 * - Resolved by the server — `value` and `reason` are populated.
 * - Deferred to the client — `evaluationKey` and `rules` are populated and the provider library must
 *   evaluate the remaining client-side conditions.
 *
 * @internal
 */
export class ServerSideEvaluation {
    constructor(
        readonly slug: string,
        readonly value?: boolean,
        readonly reason?: string,
        readonly evaluationKey?: string,
        readonly rules?: readonly ClientSideRule[]
    ) {}
}
