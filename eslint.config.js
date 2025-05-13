import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

export default tseslint
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
