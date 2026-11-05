import * as core from "./index.js";

test("the entry point loads and has no exports yet", () => {
    expect(Object.keys(core)).toEqual([]);
});
