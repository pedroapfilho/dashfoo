import { defineConfig } from "oxlint";
import awesomeness from "oxlint-config-awesomeness";
import shadcn from "oxlint-config-awesomeness/shadcn";

export default defineConfig({
  extends: [awesomeness, shadcn],
  rules: {
    // ADR 0005: the drag adapter in packages/react/src/drag is the only module
    // that may touch dnd-kit, so the primitive stays swappable.
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@dnd-kit/*"],
            message: "Import @dnd-kit only inside packages/react/src/drag.",
          },
        ],
      },
    ],
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
  },
  // Standalone starters have no workspace dependencies; lint:examples handles
  // their syntax, and test:consumers checks types after isolated installation.
  ignorePatterns: [".github/ci/*.mjs", "examples/**"],
  overrides: [
    {
      files: ["apps/docs/**"],
      rules: { "shadcn/no-unknown-classes": ["error", { allow: ["not-prose"] }] },
    },
    {
      files: ["**/__tests__/**/*.ts", "**/__tests__/**/*.tsx", "**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "max-nested-calls": "off",
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
      files: ["packages/react/src/drag/**"],
      rules: { "no-restricted-imports": "off" },
    },

    {
      files: ["packages/react/src/hooks/responsive.ts"],
      rules: {
        "react-doctor/effect-needs-cleanup": "off",
      },
    },
  ],
});
