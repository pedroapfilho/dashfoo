import { defineConfig } from "oxlint";
import awesomeness from "oxlint-config-awesomeness";

export default defineConfig({
  extends: [awesomeness],
  overrides: [
    {
      files: ["**/__tests__/**/*.ts", "**/__tests__/**/*.tsx", "**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "max-nested-calls": "off",
        "number-literal-case": "off",
      },
    },

    {
      files: ["apps/**/*.ts", "apps/**/*.tsx"],
      rules: {
        "max-lines": "off",
        "max-nested-calls": "off",
        "no-console": "off",
      },
    },
  ],
});
