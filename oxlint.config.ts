import { defineConfig } from "oxlint";
import awesomeness from "oxlint-config-awesomeness";

export default defineConfig({
  extends: [awesomeness],
  options: {
    typeAware: true,
    typeCheck: true,
  },
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
      files: [
        "packages/react/src/components/dashfoo-drag-provider.tsx",
        "packages/react/src/components/drag-preview-overlay.tsx",
        "packages/react/src/hooks/responsive.ts",
      ],
      rules: {
        "react-doctor/effect-needs-cleanup": "off",
      },
    },
  ],
});
