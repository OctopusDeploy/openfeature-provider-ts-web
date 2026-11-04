// Deliberately leaks a hidden type through a return type and a conditional branch, so the leak check has failing cases to test.
import { EvaluationContext } from "@openfeature/web-sdk";
import { HiddenBranch, HiddenResult } from "./hiddenTypes.js";

export class LeakyProvider {
    evaluate(context: EvaluationContext): HiddenResult {
        return { value: String(context.targetingKey) };
    }

    narrow<T>(value: T): T extends string ? HiddenBranch : never {
        return undefined as never;
    }
}
