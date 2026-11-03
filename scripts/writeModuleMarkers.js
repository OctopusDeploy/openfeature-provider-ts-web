// Node picks the module format of a .js file from the nearest package.json, so each build
// output gets its own marker. Without these, dist/esm would be loaded as CommonJS.
const fs = require("fs");
const path = require("path");

const markers = {
    "dist/cjs": "commonjs",
    "dist/esm": "module",
};

for (const [dir, type] of Object.entries(markers)) {
    fs.writeFileSync(path.join(__dirname, "..", dir, "package.json"), JSON.stringify({ type }, null, 4) + "\n");
}
