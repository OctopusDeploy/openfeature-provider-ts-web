import * as path from "path";
import { analyseApiSurface } from "./testing/apiSurface.js";

describe("public API of the web entry point", () => {
    const { surface, leaks } = analyseApiSurface(path.join(__dirname, "index.ts"), path.join(__dirname, "..", "tsconfig.json"));

    it("matches the committed snapshot", () => {
        expect(surface).toMatchSnapshot();
    });

    it("only exposes types it exports or that come from @openfeature", () => {
        expect(leaks).toEqual([]);
    });
});
