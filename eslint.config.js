const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const prettierRecommended = require("eslint-plugin-prettier/recommended");

// A relative specifier ("./x", "../x", "." or "..") that doesn't end in .js.
const missingJsExtension = "/^\\.{1,2}(\\/(?!.*\\.js$)|$)/";
const missingJsExtensionMessage = "Relative imports must end in .js so the ESM build loads under native Node.";

module.exports = tseslint.config(
    {
        ignores: ["**/dist/**", "**/coverage/**"],
    },
    {
        files: ["**/*.ts"],
        extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierRecommended],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
                sourceType: "module",
            },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            // Native Node ESM needs the .js extension on relative imports, including dynamic import() and
            // import("...") types, and tsc doesn't check for it.
            "no-restricted-syntax": [
                "error",
                ...["ImportDeclaration", "ExportAllDeclaration", "ExportNamedDeclaration", "ImportExpression"].map((type) => ({
                    selector: `${type}[source.value=${missingJsExtension}]`,
                    message: missingJsExtensionMessage,
                })),
                {
                    selector: `TSImportType[argument.literal.value=${missingJsExtension}]`,
                    message: missingJsExtensionMessage,
                },
            ],
        },
    },
    {
        // Core is shared by the web and server providers, so it must not depend on either SDK.
        // Shared OpenFeature types come from @openfeature/core.
        files: ["packages/core/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: ["@openfeature/web-sdk", "@openfeature/server-sdk"].map((name) => ({
                        name,
                        message: "Core is shared by both providers. Import from @openfeature/core instead.",
                    })),
                },
            ],
        },
    }
);
