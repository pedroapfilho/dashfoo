import { defineConfig } from "oxlint";
import awesomeness from "oxlint-config-awesomeness";

export default defineConfig({
  extends: [awesomeness],
  overrides: [
    // oxfmt always lowercases hex literals, while `number-literal-case` wants
    // uppercase. The two tools conflict, so disable the oxlint rule for test
    // files where hex literals appear only as fixture values.
    {
      files: ["**/__tests__/**/*.ts", "**/__tests__/**/*.tsx", "**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "number-literal-case": "off",
        // Test fixtures declare layout trees with the nested row/tabset/tab
        // builder DSL — the nesting mirrors the tree and is the readable form.
        "max-nested-calls": "off",
      },
    },
    // Demo apps are standalone references read top-to-bottom; accept length and
    // console logging that demonstrates callbacks firing.
    {
      files: ["apps/**/*.ts", "apps/**/*.tsx"],
      rules: {
        "max-lines": "off",
        "no-console": "off",
        // Demo models declare layout trees with the nested row/tabset/tab
        // builder DSL — the nesting mirrors the tree and is the readable form.
        "max-nested-calls": "off",
      },
    },
  ],
});
