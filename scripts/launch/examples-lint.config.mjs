import { defineConfig } from "oxlint";
import awesomeness from "oxlint-config-awesomeness";
import shadcn from "oxlint-config-awesomeness/shadcn";

import policy from "../../oxlint.config.ts";

export default defineConfig({
  extends: [awesomeness, shadcn],
  // Consumer CI installs the starters independently and runs real type checks.
  options: { typeAware: false, typeCheck: false },
  rules: { ...policy.rules, "max-nested-calls": "off" },
});
