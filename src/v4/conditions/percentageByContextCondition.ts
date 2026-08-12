import { ClientSideCondition } from "./clientSideCondition";

/**
 * Matches when the OpenFeature targeting key falls within the `percentage`% rollout.
 *
 * @internal
 */
export class PercentageByContextCondition extends ClientSideCondition {
    /**
     * @param percentage The rollout percentage, 0–100. Optional so an absent `percentage` stays
     * distinguishable from an explicit 0, which is a legitimate "nobody".
     */
    constructor(readonly percentage?: number) {
        super();
    }
}
