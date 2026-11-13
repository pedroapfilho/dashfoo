import reactConfig from "@repo/config-vitest/react";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  reactConfig,
  defineConfig({
    test: {
      coverage: {
        // The package is CSS: its test reads the built stylesheet, and the one
        // source line is a version constant the build replaces.
        thresholds: { branches: 0, functions: 0, lines: 0, statements: 0 },
      },
    },
  }),
);
