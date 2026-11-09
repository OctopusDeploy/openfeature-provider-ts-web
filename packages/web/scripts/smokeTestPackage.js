// Packs the package and loads the tarball under native Node with both require() and import.
// tsc doesn't check that relative imports carry a .js extension, and a missing one only fails
// when Node loads dist/esm as real ESM, so this is the check that catches it.
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "openfeature-smoke-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

// Windows can only run npm.cmd through a shell, but the inline node -e scripts must not go through one,
// because cmd.exe would mangle their quotes and newlines.
const run = (command, args, cwd) =>
    execFileSync(command, args, { cwd, stdio: ["ignore", "pipe", "inherit"], shell: process.platform === "win32" && command === npm }).toString();

try {
    const pack = (dir) => path.join(workDir, run(npm, ["pack", "--silent", "--pack-destination", workDir], dir).trim().split("\n").pop());
    // Core is packed alongside web because the exact version web pins may not be on npm yet. Installing both tarballs
    // together satisfies that pin from the local build instead of the registry.
    const tarballs = [pack(path.join(root, "..", "core")), pack(root)];
    fs.writeFileSync(path.join(workDir, "package.json"), JSON.stringify({ name: "smoke-test", private: true }));
    run(npm, ["install", "--silent", "--no-audit", "--no-fund", "--no-package-lock", ...tarballs], workDir);

    const check = `
        const { OctopusFeatureProvider, ProductMetadata } = PROVIDER;
        const provider = new OctopusFeatureProvider({ clientIdentifier: "smoke-test", productMetadata: new ProductMetadata("smoke-test") });
        if (provider.metadata.name !== "octopus-ts-web-provider") throw new Error("Unexpected provider metadata");
    `;

    const cjs = `const PROVIDER = require("@octopusdeploy/openfeature");${check}console.log("require(): ok");`;
    process.stdout.write(run(process.execPath, ["-e", cjs], workDir));

    // The ESM build should load the ESM builds of core and the OpenFeature SDK, not a second CJS copy of either.
    const esm = `
        import * as PROVIDER from "@octopusdeploy/openfeature";
        import Module from "node:module";
        ${check}
        const cjs = Object.keys(Module._cache).filter((file) => /[\\\\/]@(openfeature|octopusdeploy)[\\\\/]/.test(file));
        if (cjs.length > 0) throw new Error("ESM build loaded a CommonJS build: " + cjs.join(", "));
        console.log("import: ok");
    `;
    process.stdout.write(run(process.execPath, ["--input-type=module", "-e", esm], workDir));
} finally {
    fs.rmSync(workDir, { recursive: true, force: true });
}
