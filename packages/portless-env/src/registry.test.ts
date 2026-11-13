import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { apps } from "./registry";

describe("registry", () => {
  it.each(Object.entries(apps))(
    "runs the %s dev script under its portless name",
    async (app, { name }) => {
      const manifest = await readFile(
        new URL(`../../../apps/${app}/package.json`, import.meta.url),
        "utf8",
      );

      const { scripts } = JSON.parse(manifest);

      expect(scripts.dev).toContain(`portless run --name ${name} `);
    },
  );
});
