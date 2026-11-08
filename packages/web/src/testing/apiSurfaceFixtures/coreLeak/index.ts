// Deliberately leaks a type that core declares but this entry point doesn't export, so the leak check has a failing case for
// types that come from core rather than from web itself.
import { ServerSideEvaluation } from "@octopusdeploy/openfeature-core";

export class CoreLeakyProvider {
    evaluation(): ServerSideEvaluation | undefined {
        return undefined;
    }
}
