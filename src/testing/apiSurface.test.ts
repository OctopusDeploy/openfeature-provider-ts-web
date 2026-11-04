import * as path from "path";
import { analyseApiSurface } from "./apiSurface.js";

const tsconfig = path.join(__dirname, "..", "..", "tsconfig.json");
const fixture = (name: string) => path.join(__dirname, "apiSurfaceFixtures", name, "index.ts");

describe("analyseApiSurface", () => {
    it("reports a type that is reachable from the surface but not exported", () => {
        const { leaks } = analyseApiSurface(fixture("leak"), tsconfig);

        expect(leaks).toEqual(["LeakyProvider exposes HiddenResult (src/testing/apiSurfaceFixtures/leak/hiddenResult.ts)"]);
    });

    it("marks a class re-exported with `export type` as type-only", () => {
        const { surface } = analyseApiSurface(fixture("typeOnlyClass"), tsconfig);

        expect(surface).toContain("class Widget (type-only export)");
    });

    it("includes parameter properties declared on an overloaded constructor", () => {
        const { surface } = analyseApiSurface(fixture("overloadedConstructor"), tsconfig);

        expect(surface).toContain("    readonly extra?: string\n    readonly name: string\n");
    });
});
