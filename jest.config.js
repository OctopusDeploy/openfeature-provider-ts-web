module.exports = {
    preset: "ts-jest/presets/js-with-ts",
    globalSetup: "<rootDir>/jest.globalSetup.js",
    projects: [
        {
            displayName: "api-surface",
            rootDir: "<rootDir>/api-surface",
            testEnvironment: "node",
            moduleFileExtensions: ["ts", "js"],
            moduleNameMapper: {
                "^(\\.{1,2}/.*)\\.js$": "$1",
            },
            resetMocks: true,
            // The fixtures are read by the compiler, not run, so only the checker's own tests belong here.
            testRegex: ".*\\.(test|spec)\\.(ts)$",
            transform: {
                ".(ts)": "ts-jest",
            },
        },
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
        {
            displayName: "server",
            rootDir: "<rootDir>/packages/server",
            // No localStorage mock: server runs in Node, so nothing it calls should reach for browser storage.
            testEnvironment: "node",
            moduleFileExtensions: ["ts", "js"],
            moduleNameMapper: {
                "^(\\.{1,2}/.*)\\.js$": "$1",
            },
            resetMocks: true,
            setupFilesAfterEnv: ["jest-expect-message", "jest-extended"],
            // Like web, server runs against core's built output.
            transformIgnorePatterns: ["/node_modules/", "/packages/core/dist/"],
            testRegex: ".*\\.(test|spec)\\.(ts)$",
            transform: {
                ".(ts)": "ts-jest",
            },
        },
    ],
};
