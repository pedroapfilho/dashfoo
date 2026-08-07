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

    // All four sites do clean up, in a shape the rule cannot follow: the drag
    // effects unsubscribe through the functions dnd-kit's `monitor.addEventListener`
    // returns rather than a matching `removeEventListener`, and `useContainerWidth`
    // disconnects its ResizeObserver from a sibling unmount effect because the
    // observer is created in a callback ref, which has no cleanup slot.
    {
      files: [
        "packages/react/src/components/drag-overlays.tsx",
        "packages/react/src/components/drag-root.tsx",
        "packages/react/src/hooks/responsive.ts",
      ],
      rules: {
        "react-doctor/effect-needs-cleanup": "off",
      },
    },
  ],
});
