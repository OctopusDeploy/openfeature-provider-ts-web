module.exports = {
    preset: "ts-jest/presets/js-with-ts",
    projects: [
        {
            displayName: "test",
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
