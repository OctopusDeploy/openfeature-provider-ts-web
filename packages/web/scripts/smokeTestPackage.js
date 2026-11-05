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
    const tarball = run(npm, ["pack", "--silent", "--pack-destination", workDir], root).trim().split("\n").pop();
    fs.writeFileSync(path.join(workDir, "package.json"), JSON.stringify({ name: "smoke-test", private: true }));
    run(npm, ["install", "--silent", "--no-audit", "--no-fund", "--no-package-lock", path.join(workDir, tarball)], workDir);

    const check = `
        const { OctopusFeatureProvider, ProductMetadata } = PROVIDER;
        const provider = new OctopusFeatureProvider({ clientIdentifier: "smoke-test", productMetadata: new ProductMetadata("smoke-test") });
        if (provider.metadata.name !== "octopus-ts-web-provider") throw new Error("Unexpected provider metadata");
    `;

    const cjs = `const PROVIDER = require("@octopusdeploy/openfeature");${check}console.log("require(): ok");`;
    process.stdout.write(run(process.execPath, ["-e", cjs], workDir));

    // The ESM build should load the ESM build of the OpenFeature SDK, not a second CJS copy.
    const esm = `
        import * as PROVIDER from "@octopusdeploy/openfeature";
        import Module from "node:module";
        ${check}
        const cjsSdk = Object.keys(Module._cache).filter((file) => file.includes("@openfeature"));
        if (cjsSdk.length > 0) throw new Error("ESM build loaded the CommonJS OpenFeature SDK: " + cjsSdk.join(", "));
        console.log("import: ok");
    `;
    process.stdout.write(run(process.execPath, ["--input-type=module", "-e", esm], workDir));
} finally {
    fs.rmSync(workDir, { recursive: true, force: true });
}
