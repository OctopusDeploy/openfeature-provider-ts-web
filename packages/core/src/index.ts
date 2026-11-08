// Core's exports are internal: they exist for the provider packages, not for their consumers.
// Each declaration keeps its @internal tag, and the providers' builds strip them from their own
// .d.ts so nothing here reaches a provider's public API.
export type { ClientSideEvaluationContext } from "./v4/clientSideEvaluationContext.js";
export { ClientSideRule } from "./v4/clientSideRule.js";
export { ContextAttributeIsOneOfCondition } from "./v4/conditions/contextAttributeIsOneOfCondition.js";
export { parseServerSideEvaluations } from "./v4/parseServerSideEvaluation.js";
export { ServerSideEvaluation } from "./v4/serverSideEvaluation.js";
