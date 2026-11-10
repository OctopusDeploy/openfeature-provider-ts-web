// Packs the package and loads the tarball under native Node with both require() and import.
// tsc doesn't check that relative imports carry a .js extension, and a missing one only fails
// when Node loads dist/esm as real ESM, so this is the check that catches it.
// It also checks that the packed package depends on core and nothing else, and that installing it
// never brings in the web SDK.
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "openfeature-server-smoke-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

// Windows can only run npm.cmd through a shell, but the inline node -e scripts must not go through one,
// because cmd.exe would mangle their quotes and newlines.
const run = (command, args, cwd) =>
    execFileSync(command, args, { cwd, stdio: ["ignore", "pipe", "inherit"], shell: process.platform === "win32" && command === npm }).toString();

try {
    const pack = (dir) => path.join(workDir, run(npm, ["pack", "--silent", "--pack-destination", workDir], dir).trim().split("\n").pop());
    // Core is packed alongside server because the exact version server pins may not be on npm yet. Installing both
    // tarballs together satisfies that pin from the local build instead of the registry.
    const tarballs = [pack(path.join(root, "..", "core")), pack(root)];
    fs.writeFileSync(path.join(workDir, "package.json"), JSON.stringify({ name: "smoke-test", private: true }));
    run(npm, ["install", "--silent", "--no-audit", "--no-fund", "--no-package-lock", ...tarballs], workDir);

    // Server's only runtime dependency is core. Anything else server needs at runtime belongs in core, which declares
    // it once for both providers. Until BMBB-1401 adds server to Release Please, nothing would bump an exact pin when
    // core is released, so server takes any core and the workspace supplies it. BMBB-1401 pins it, and checks it here.
    const readManifest = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
    const core = readManifest(path.join(root, "..", "core"));
    const packed = readManifest(path.join(workDir, "node_modules", "@octopusdeploy", "openfeature-server"));
    const expectedDependencies = JSON.stringify({ [core.name]: "*" });
    const actualDependencies = JSON.stringify(packed.dependencies ?? {});
    if (actualDependencies !== expectedDependencies) {
        throw new Error(`Expected the packed dependencies to be exactly ${expectedDependencies}, but they were ${actualDependencies}`);
    }
    console.log("dependencies: ok");

    // npm 7+ installs peers, so this tree is what a Node app gets. The web SDK has no place in it.
    if (fs.existsSync(path.join(workDir, "node_modules", "@openfeature", "web-sdk"))) {
        throw new Error("Installing the server provider brought in @openfeature/web-sdk");
    }
    if (!fs.existsSync(path.join(workDir, "node_modules", "@openfeature", "server-sdk"))) {
        throw new Error("Expected npm to install the @openfeature/server-sdk peer dependency");
    }
    console.log("no web SDK: ok");

    const check = `
        const { OctopusFeatureProvider, ProductMetadata } = PROVIDER;
        const provider = new OctopusFeatureProvider({ clientIdentifier: "smoke-test", productMetadata: new ProductMetadata("smoke-test") });
        if (provider.metadata.name !== "octopus-ts-server-provider") throw new Error("Unexpected provider metadata");
        if (provider.runsOn !== "server") throw new Error("Unexpected provider runsOn");
    `;

    const cjs = `const PROVIDER = require("@octopusdeploy/openfeature-server");${check}console.log("require(): ok");`;
    process.stdout.write(run(process.execPath, ["-e", cjs], workDir));

    // The ESM build should load the ESM builds of core and the OpenFeature SDK, not a second CJS copy of either.
    const esm = `
        import * as PROVIDER from "@octopusdeploy/openfeature-server";
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
