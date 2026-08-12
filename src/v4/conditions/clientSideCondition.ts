import { ClientSideEvaluationContext } from "../clientSideEvaluationContext";

/**
 * Base type for a client-side rule condition, selected from the camelCase `type` discriminator when
 * deserialising a v4 evaluation response.
 *
 * @internal
 */
export abstract class ClientSideCondition {
    /**
     * Whether this condition is met. A condition that did not arrive in a shape its type can evaluate
     * throws `ParseError` rather than reading a value it was not sent.
     */
    abstract matches(context: ClientSideEvaluationContext): boolean;
}
