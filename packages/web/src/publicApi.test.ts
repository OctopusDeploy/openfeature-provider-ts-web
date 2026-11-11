import * as path from "path";
import { analyseApiSurface } from "api-surface";

describe("public API of the web entry point", () => {
    // Use the build config so inferred types match the published declarations, not the jest and node globals tests compile with.
    const tsconfig = path.join(__dirname, "..", "tsconfig.build.cjs.json");
    const { surface, leaks } = analyseApiSurface(path.join(__dirname, "index.ts"), tsconfig);

    it("matches the committed snapshot", () => {
        expect(surface).toMatchSnapshot();
    });

    it("only exposes types it exports or that come from @openfeature", () => {
        expect(leaks).toEqual([]);
    });
});
