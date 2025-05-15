// eslint.config.js
const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");
const eslintPluginPrettier = require("eslint-plugin-prettier/recommended");

module.exports = tseslint
  .config(
    { ignores: ["dist"] },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ["**/*.{ts,tsx}"],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
      },
      plugins: {},
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "no-useless-catch": "off",
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/no-namespace": "off",
      },
    },
  )
  .concat(eslintPluginPrettier);
