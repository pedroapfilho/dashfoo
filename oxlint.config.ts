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

    {
      // demo-vite is a Vite app: next/image does not exist there, so the Next-specific
      // img ban cannot be satisfied.
      files: ["apps/demo-vite/**/*.tsx"],
      rules: {
        "nextjs/no-img-element": "off",
      },
    },

    {
      files: ["packages/react/src/hooks/responsive.ts"],
      rules: {
        "react-doctor/effect-needs-cleanup": "off",
      },
    },
  ],
});
