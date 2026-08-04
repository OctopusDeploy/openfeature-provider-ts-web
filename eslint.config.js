const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const prettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = tseslint.config(
    {
        ignores: ["dist/**", "coverage/**"],
    },
    {
        files: ["**/*.ts"],
        extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierRecommended],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.json"],
                sourceType: "module",
            },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/ban-ts-comment": "off",
        },
    }
);
