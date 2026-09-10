import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const work = await mkdtemp(path.join(tmpdir(), "dashfoo-consumers-"));
const run = (cmd, args, cwd) => {
  const result = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed (${result.status})`);
  }
};
const bundleBytes = async (directory) => {
  const files = await readdir(directory, { recursive: true });
  const sizes = await Promise.all(
    files
      .filter((file) => file.endsWith(".js"))
      .map(async (file) => gzipSync(await readFile(path.join(directory, file))).length),
  );
  return sizes.reduce((sum, size) => sum + size, 0);
};
const checkTailwindTheme = async (target) => {
  await writeFile(
    path.join(target, "theme-input.css"),
    '@import "tailwindcss";\n@import "@dashfoo/theme/tailwind.css";\n',
  );
  run(
    path.join(target, "node_modules/.bin/tailwindcss"),
    ["--input", "theme-input.css", "--output", "theme-output.css"],
    target,
  );
  const css = await readFile(path.join(target, "theme-output.css"), "utf8");
  if (!css.includes('data-dashfoo="tab"')) {
    throw new Error("Packed Tailwind theme did not emit tab styles");
  }
};
const results = [];
try {
  const packed = {};
  const artifacts = {};
  for (const name of ["core", "react", "theme"]) {
    run("pnpm", ["pack", "--pack-destination", work], path.join(repo, "packages", name));
    const files = await readdir(work);
    const filename = files.find(
      (file) => file.startsWith(`dashfoo-${name}-`) && file.endsWith(".tgz"),
    );
    if (!filename) {
      throw new Error(`Missing ${name} tarball`);
    }
    const archive = path.join(work, filename);
    const contents = await readFile(archive);
    artifacts[name] = { filename, sha256: createHash("sha256").update(contents).digest("hex") };
    if (process.env.LAUNCH_ARTIFACT_DIR) {
      await mkdir(process.env.LAUNCH_ARTIFACT_DIR, { recursive: true });
      await cp(archive, path.join(process.env.LAUNCH_ARTIFACT_DIR, filename));
    }
    packed[`@dashfoo/${name}`] = `file:${path.join(work, filename)}`;
  }
  for (const [framework, version, manager] of [
    ["vite", "18.3.1", "npm"],
    ["vite", "19.2.7", "pnpm"],
    ["next", "19.2.7", "npm"],
  ]) {
    const target = path.join(work, `${framework}-${version}`);
    await cp(path.join(repo, "examples", framework), target, { recursive: true });
    const pkg = JSON.parse(await readFile(path.join(target, "package.json"), "utf8"));
    Object.assign(pkg.dependencies, packed, { react: version, "react-dom": version });
    Object.assign(pkg.devDependencies, {
      "@types/react": version.startsWith("18") ? "^18.3.0" : "^19.2.0",
      "@types/react-dom": version.startsWith("18") ? "^18.3.0" : "^19.2.0",
      jsdom: "^30.0.1",
    });
    if (framework === "vite" && version.startsWith("19")) {
      Object.assign(pkg.devDependencies, { "@tailwindcss/cli": "^4.3.3", tailwindcss: "^4.3.3" });
    }
    if (manager === "npm") {
      pkg.overrides = packed;
    } else {
      const overrides = Object.entries(packed)
        .map(([name, specifier]) => `  "${name}": "${specifier}"\n`)
        .join("");
      await writeFile(
        path.join(target, "pnpm-workspace.yaml"),
        `allowBuilds:\n  "@parcel/watcher": false\noverrides:\n${overrides}`,
      );
    }
    await writeFile(path.join(target, "package.json"), JSON.stringify(pkg, null, 2));
    run(manager, ["install", ...(manager === "npm" ? ["--no-audit", "--no-fund"] : [])], target);
    await cp(
      path.join(repo, "scripts/launch/consumer-runtime.mjs.fixture"),
      path.join(target, "consumer-runtime.mjs"),
    );
    run("node", ["consumer-runtime.mjs"], target);
    run(manager, ["run", "build"], target);
    run(
      "node",
      [path.join(repo, "scripts/launch/consumer-browser.mjs"), target, framework],
      target,
    );
    const result = {
      browser: "passed",
      build: "passed",
      framework,
      manager,
      react: version,
      runtime: "passed",
    };
    if (framework === "vite") {
      result.fullAppJsGzipBytes = await bundleBytes(path.join(target, "dist"));
      await writeFile(
        path.join(target, "src/main.tsx"),
        'import { createRoot } from "react-dom/client"; const root = document.getElementById("root"); if(root) createRoot(root).render(<p>Baseline</p>);',
      );
      run(manager, ["run", "build"], target);
      result.reactBaselineJsGzipBytes = await bundleBytes(path.join(target, "dist"));
      result.incrementalJsGzipBytes = result.fullAppJsGzipBytes - result.reactBaselineJsGzipBytes;
      if (version.startsWith("19")) {
        await checkTailwindTheme(target);
        result.tailwindTheme = "passed";
        await cp(
          path.join(repo, "scripts/launch/workload.tsx.fixture"),
          path.join(target, "src/main.tsx"),
        );
        run(manager, ["run", "build"], target);
        run(
          "node",
          [path.join(repo, "scripts/launch/consumer-browser.mjs"), target, framework, "benchmark"],
          target,
        );
      }
    }
    results.push(result);
  }
  const report = {
    arch: process.arch,
    artifacts,
    node: process.version,
    platform: process.platform,
    results,
  };
  console.log(JSON.stringify(report, null, 2));
  if (process.env.LAUNCH_REPORT_DIR) {
    await writeFile(
      path.join(process.env.LAUNCH_REPORT_DIR, "consumers.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  }
} finally {
  await rm(work, { force: true, recursive: true });
}
