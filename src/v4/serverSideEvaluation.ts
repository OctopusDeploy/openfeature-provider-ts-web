import { EvaluationContext, ParseError, ResolutionDetails } from "@openfeature/web-sdk";
import { ClientSideRule } from "./clientSideRule";
import * as EvaluationReasons from "./evaluationReasons";

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

    /**
     * Resolves the flag, evaluating the client-side rules if the server left any: the flag is enabled
     * when any rule matches.
     *
     * A response in neither shape throws `ParseError`, which the OpenFeature SDK turns into the
     * caller's default value.
     */
    evaluate(context: EvaluationContext | undefined): ResolutionDetails<boolean> {
        if (this.value !== undefined) {
            if (this.reason === undefined) {
                throw new ParseError("The flag has a value but has no reason.");
            }

            if (this.evaluationKey !== undefined || this.rules !== undefined) {
                throw new ParseError("The flag has both a server-resolved value and client-side rules.");
            }

            return { value: this.value, reason: this.reason };
        }

        if (this.rules === undefined) {
            throw new ParseError("The flag has neither a value nor rules.");
        }

        if (this.evaluationKey === undefined) {
            throw new ParseError("The flag defers to the client but has no evaluation key.");
        }

        if (this.rules.length === 0) {
            throw new ParseError("The flag defers to the client with no rules.");
        }

        const ruleContext = { evaluationKey: this.evaluationKey, openFeatureContext: context };
        const rules: readonly (ClientSideRule | undefined)[] = this.rules;

        for (const rule of rules) {
            if (rule === undefined) {
                throw new ParseError("The flag has a missing rule.");
            }

            if (rule.matches(ruleContext)) {
                return { value: true, reason: EvaluationReasons.matchedRule(rule.name) };
            }
        }

        return { value: false, reason: EvaluationReasons.didNotMatchAnyRules() };
    }
}
