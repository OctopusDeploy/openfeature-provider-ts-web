module.exports = {
    preset: "ts-jest/presets/js-with-ts",
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
            testRegex: ".*\\.(test|spec)\\.(ts)$",
            transform: {
                ".(ts)": "ts-jest",
            },
        },
    ],
};
