import { ClientSideCondition } from "./conditions/clientSideCondition";

/**
 * A named rule the provider library still has to evaluate on the client side. The rule matches when
 * every one of its conditions matches.
 *
 * @internal
 */
export class ClientSideRule {
    constructor(
        readonly name: string,
        readonly conditions: readonly ClientSideCondition[]
    ) {}
}
