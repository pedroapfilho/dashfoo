// The starters in examples/ install from npm, outside the workspace, so
// `changeset version` never bumps their @dashfoo/* ranges. This runs after it.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "..");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const published = new Map();

for (const name of await readdir(path.join(repo, "packages"))) {
  const manifest = await readJson(path.join(repo, "packages", name, "package.json"));

  if (manifest.private !== true) {
    published.set(manifest.name, manifest.version);
  }
}

for (const name of await readdir(path.join(repo, "examples"))) {
  const file = path.join(repo, "examples", name, "package.json");
  const manifest = await readJson(file);

  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    const version = published.get(dependency);

    if (version !== undefined) {
      manifest.dependencies[dependency] = `^${version}`;
    }
  }

  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
}
