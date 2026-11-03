// Deliberately leaks HiddenResult so the leak check has a failing case to test.
import { EvaluationContext } from "@openfeature/web-sdk";
import { HiddenResult } from "./hiddenResult.js";

export class LeakyProvider {
    evaluate(context: EvaluationContext): HiddenResult {
        return { value: String(context.targetingKey) };
    }
}
