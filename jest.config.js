module.exports = {
    preset: "ts-jest/presets/js-with-ts",
    globalSetup: "<rootDir>/jest.globalSetup.js",
    projects: [
        {
            displayName: "core",
            rootDir: "<rootDir>/packages/core",
            testEnvironment: "node",
            moduleFileExtensions: ["ts", "js"],
            moduleNameMapper: {
                "^(\\.{1,2}/.*)\\.js$": "$1",
            },
            resetMocks: true,
            testRegex: ".*\\.(test|spec)\\.(ts)$",
            transform: {
                ".(ts)": "ts-jest",
            },
        },
        {
            displayName: "web",
            rootDir: "<rootDir>/packages/web",
            moduleDirectories: ["<rootDir>/src/", "node_modules"],
            moduleFileExtensions: ["ts", "js"],
            // Source imports use .js extensions for native ESM; resolve them to the .ts files.
            moduleNameMapper: {
                "^(\\.{1,2}/.*)\\.js$": "$1",
            },
            resetMocks: true,
            setupFilesAfterEnv: ["jest-expect-message", "jest-extended", "jest-localstorage-mock"],
            // Web runs against core's built output, which jest.globalSetup.js rebuilds before every run.
            // The workspace symlink resolves to packages/core, outside node_modules, so keep the
            // transform away from core's already-compiled JavaScript.
            transformIgnorePatterns: ["/node_modules/", "/packages/core/dist/"],
            testRegex: ".*\\.(test|spec)\\.(ts)$",
            transform: {
                ".(ts)": "ts-jest",
            },
        },
    ],
};
