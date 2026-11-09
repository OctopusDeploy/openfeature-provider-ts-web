// Web's tests run against core's built output, as web does once published. Build core before every run, including each
// re-run in watch mode and runs started from an IDE or `npx jest`, so web is never tested against a stale core.
const { execFileSync } = require("child_process");

module.exports = () => {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    execFileSync(npm, ["run", "build", "--silent", "-w", "packages/core"], { cwd: __dirname, stdio: "inherit", shell: process.platform === "win32" });
};
