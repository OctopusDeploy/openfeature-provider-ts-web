// Core's exports exist for the provider packages. Everything except ProductMetadata is internal
// and keeps its @internal tag. ProductMetadata is public, so each provider re-exports it from its
// own entry point.
export { ProductMetadata } from "./configuration/productMetadata.js";
export type { EvaluationResponse } from "./evaluation/evaluationResponse.js";
export { FeatureFlagEvaluator } from "./evaluation/featureFlagEvaluator.js";
export { octopusHttpHeaderNames } from "./http/octopusHttpHeaderNames.js";
export { ClientSideRule } from "./v4/clientSideRule.js";
export { ContextAttributeIsOneOfCondition } from "./v4/conditions/contextAttributeIsOneOfCondition.js";
export { parseServerSideEvaluations } from "./v4/parseServerSideEvaluation.js";
export { ServerSideEvaluation } from "./v4/serverSideEvaluation.js";
