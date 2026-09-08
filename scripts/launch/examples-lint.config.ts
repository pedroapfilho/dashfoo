import { defineConfig } from "oxlint";
import awesomeness from "oxlint-config-awesomeness";

export default defineConfig({
  extends: [awesomeness],
  // Consumer CI installs the starters independently and runs real type checks.
  options: { typeAware: false, typeCheck: false },
  rules: { "max-nested-calls": "off" },
});
