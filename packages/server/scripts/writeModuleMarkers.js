// Node picks the module format of a .js file from the nearest package.json, so each build
// output gets its own marker. Without these, dist/esm would be loaded as CommonJS.
// "sideEffects" is repeated here because esbuild only reads it from the nearest package.json,
// unlike webpack and Rollup, which use the root one. It promises that no module in src runs code
// on import, so keep it that way or drop the flag.
const fs = require("fs");
const path = require("path");

const markers = {
    "dist/cjs": "commonjs",
    "dist/esm": "module",
};

for (const [dir, type] of Object.entries(markers)) {
    fs.writeFileSync(path.join(__dirname, "..", dir, "package.json"), JSON.stringify({ type, sideEffects: false }, null, 4) + "\n");
}
