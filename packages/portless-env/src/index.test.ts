import { describe, expect, it } from "vitest";

import { apps, canonicalUrls, urlEnv } from "./apps";
import type { App, UrlEnvKey } from "./apps";

import { applyPortlessUrls, portlessUrl } from "./index";

const appIds = Object.keys(apps) as Array<App>;
const envKeys = Object.keys(urlEnv) as Array<UrlEnvKey>;
const [firstApp] = appIds as [App, ...Array<App>];
const [firstKey] = envKeys as [UrlEnvKey, ...Array<UrlEnvKey>];

const PORTLESS_URL = "https://fix-styles.localhost";

const worktree = () => {
  const calls: Array<Array<string>> = [];

  const run = (file: string, args: ReadonlyArray<string>) => {
    calls.push([file, ...args]);

    return `https://fix-styles.${args.at(-1)}.localhost\n`;
  };

  return { calls, run };
};

const worktreeUrls = (key: UrlEnvKey): string =>
  urlEnv[key].map((app: App) => `https://fix-styles.${apps[app].name}.localhost`).join(",");

const failing = () => {
  throw new Error("spawnSync portless ENOENT");
};

describe("portlessUrl", () => {
  it("asks portless for the app's worktree-prefixed URL", () => {
    const { calls, run } = worktree();

    expect(portlessUrl(firstApp, { run })).toBe(
      `https://fix-styles.${apps[firstApp].name}.localhost`,
    );
    expect(calls).toEqual([["portless", "get", apps[firstApp].name]]);
  });

  it("throws when portless prints something other than a URL", () => {
    expect(() => portlessUrl(firstApp, { run: () => "no route\n" })).toThrow(
      `portless get ${apps[firstApp].name} printed "no route" instead of a URL`,
    );
  });
});

describe("applyPortlessUrls", () => {
  it("does nothing outside a portless child", () => {
    for (const env of [{}, { PORTLESS_URL: "" }]) {
      const { calls, run } = worktree();
      applyPortlessUrls(envKeys, { env, run });
      expect(env).not.toHaveProperty(firstKey);
      expect(calls).toEqual([]);
    }
  });

  it("fills unset, empty and canonical-default keys from portless", () => {
    for (const current of [undefined, "", canonicalUrls(firstKey).join(",")]) {
      const { run } = worktree();
      const env: Record<string, string | undefined> = { [firstKey]: current, PORTLESS_URL };
      applyPortlessUrls(envKeys, { env, run });

      for (const key of envKeys) {
        expect(env[key]).toBe(worktreeUrls(key));
      }
    }
  });

  it("keeps a value that is not the canonical default", () => {
    const { calls, run } = worktree();
    const env = { [firstKey]: "https://app.example.com", PORTLESS_URL };
    applyPortlessUrls([firstKey], { env, run });
    expect(env[firstKey]).toBe("https://app.example.com");
    expect(calls).toEqual([]);
  });

  it("looks each app up once per call", () => {
    const { calls, run } = worktree();
    applyPortlessUrls([...envKeys, ...envKeys], { env: { PORTLESS_URL }, run });

    const looked = calls.map((call) => call.at(-1));

    expect(new Set(looked).size).toBe(looked.length);
  });

  it("throws instead of leaving a key half-filled when the lookup fails", () => {
    const env = { PORTLESS_URL };

    expect(() => {
      applyPortlessUrls([firstKey], { env, run: failing });
    }).toThrow("spawnSync portless ENOENT");
    expect(env).not.toHaveProperty(firstKey);
  });
});
