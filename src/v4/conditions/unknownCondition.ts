import { ClientSideCondition } from "./clientSideCondition";

/**
 * A client-side condition whose `type` discriminator this version of the provider does not
 * recognise, or which carried no discriminator at all. Rather than failing the whole evaluation
 * response, an unrecognised condition is preserved as this type. It always evaluates to false, so a
 * rule containing an unknown condition can never match — a newer server capability is safely treated
 * as "not met" by an older client.
 *
 * @internal
 */
export class UnknownCondition extends ClientSideCondition {
    /**
     * @param type The unrecognised discriminator value, or undefined if none was present.
     */
    constructor(readonly type?: string) {
        super();
    }
}
