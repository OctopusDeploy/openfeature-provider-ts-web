module.exports = {
    preset: "ts-jest/presets/js-with-ts",
    projects: [
        {
            displayName: "test",
            moduleDirectories: ["<rootDir>/src/", "node_modules"],
            moduleFileExtensions: ["ts", "js"],
            resetMocks: true,
            setupFilesAfterEnv: ["jest-expect-message", "jest-extended", "jest-localstorage-mock"],
            testRegex: ".*\\.(test|spec)\\.(ts)$",
            transform: {
                ".(ts)": "ts-jest",
            },
        },
    ],
};
