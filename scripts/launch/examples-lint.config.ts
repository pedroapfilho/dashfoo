import { defineConfig } from "oxlint";
import awesomeness from "oxlint-config-awesomeness";

import policy from "../../oxlint.config.ts";

export default defineConfig({
  extends: [awesomeness],
  jsPlugins: policy.jsPlugins,
  // Consumer CI installs the starters independently and runs real type checks.
  options: { typeAware: false, typeCheck: false },
  rules: { ...policy.rules, "max-nested-calls": "off" },
});
