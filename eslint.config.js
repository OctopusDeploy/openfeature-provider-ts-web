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
            // Native Node ESM needs the .js extension on relative imports, and tsc doesn't check for it.
            "no-restricted-syntax": [
                "error",
                ...["ImportDeclaration", "ExportAllDeclaration", "ExportNamedDeclaration"].map((type) => ({
                    selector: `${type}[source.value=/^\\.{1,2}\\/(?!.*\\.js$)/]`,
                    message: "Relative imports must end in .js so the ESM build loads under native Node.",
                })),
            ],
        },
    }
);
