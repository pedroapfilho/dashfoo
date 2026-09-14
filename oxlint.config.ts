import { defineConfig } from "oxlint";
import awesomeness from "oxlint-config-awesomeness";

export default defineConfig({
  extends: [awesomeness],
  jsPlugins: ["@shadcn/lint"],
  rules: {
    "shadcn/no-restyle": [
      "error",
      {
        allow: ["layout"],
        contracts: [
          {
            allow: ["layout", "gap-*"],
            pattern: "^PopoverTrigger$",
          },
        ],
      },
    ],
    "shadcn/no-unknown-classes": "error",
    "shadcn/require-static-classes": "error",
  },
  // Standalone starters have no workspace dependencies; lint:examples handles
  // their syntax, and test:consumers checks types after isolated installation.
  ignorePatterns: ["examples/**"],
  overrides: [
    {
      files: ["apps/docs/**"],
      rules: { "shadcn/no-unknown-classes": ["error", { allow: ["not-prose"] }] },
    },
    {
      files: ["packages/react/src/components/panel.test.tsx"],
      rules: { "shadcn/no-unknown-classes": ["error", { allow: ["shell", "body"] }] },
    },
    {
      files: ["apps/docs/components/ui/**"],
      rules: {
        "shadcn/no-restyle": "off",
        "shadcn/require-static-classes": "off",
      },
    },
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
