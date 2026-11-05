const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const prettierRecommended = require("eslint-plugin-prettier/recommended");

// no-restricted-syntax entries that reject a module specifier matching `pattern` wherever one can
// appear: static and dynamic imports, type-only imports, re-exports, and import("...") types.
const restrictSpecifier = (pattern, message) => [
    ...["ImportDeclaration", "ExportAllDeclaration", "ExportNamedDeclaration", "ImportExpression"].map((type) => ({
        selector: `${type}[source.value=${pattern}]`,
        message,
    })),
    {
        selector: `TSImportType[argument.literal.value=${pattern}]`,
        message,
    },
];

// Native Node ESM needs the .js extension on relative imports ("./x", "../x", "." or ".."), and tsc
// doesn't check for it.
const missingJsExtension = restrictSpecifier(
    "/^\\.{1,2}(\\/(?!.*\\.js$)|$)/",
    "Relative imports must end in .js so the ESM build loads under native Node."
);

// Core is shared by the web and server providers, so it must not depend on either SDK, including
// through a subpath. Shared OpenFeature types come from @openfeature/core.
const openFeatureSdk = restrictSpecifier(
    "/^@openfeature\\/(web|server)-sdk(\\/|$)/",
    "Core is shared by both providers. Import from @openfeature/core instead."
);

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
            "no-restricted-syntax": ["error", ...missingJsExtension],
        },
    },
    {
        files: ["packages/core/**/*.ts"],
        rules: {
            // A later config replaces a rule's options rather than merging them, so repeat the
            // .js extension check alongside the SDK ban.
            "no-restricted-syntax": ["error", ...missingJsExtension, ...openFeatureSdk],
        },
    }
);
