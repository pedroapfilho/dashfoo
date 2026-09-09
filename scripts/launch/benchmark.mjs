import { writeFile } from "node:fs/promises";
import os from "node:os";
import { performance } from "node:perf_hooks";

import {
  fromJSON,
  model,
  reducer,
  row,
  tab,
  tabset,
  toJSON,
} from "../../packages/core/dist/index.js";

const samples = 500;
const measure = (operation) => {
  for (let index = 0; index < 100; index++) {
    operation();
  }
  const times = Array.from({ length: samples }, () => {
    const start = performance.now();
    operation();
    return performance.now() - start;
  }).toSorted((left, right) => left - right);
  return { medianMs: times[Math.floor(samples / 2)], p95Ms: times[Math.floor(samples * 0.95)] };
};
const results = [10, 50, 100].map((count) => {
  const tabs = Array.from({ length: count - 1 }, (_, index) =>
    tab(`panel-${index}`, `Panel ${index}`),
  );
  const target = tabset([tab("target", "Target")], { id: "side" });
  const tree = row([tabset(tabs, { id: "main" }), target], { id: "root" });
  const layout = model(tree);
  const json = toJSON(layout);
  return {
    dock: measure(() =>
      reducer(layout, {
        location: "split-bottom",
        sourceId: "panel-0",
        targetId: "side",
        type: "moveNode",
      }),
    ),
    movableTabs: count - 1,
    rename: measure(() =>
      reducer(layout, { name: "Renamed", tabId: "panel-0", type: "renameTab" }),
    ),
    roundTrip: measure(() => fromJSON(toJSON(layout))),
    serializedBytes: Buffer.byteLength(json),
    tabs: count,
  };
});
const report = {
  arch: process.arch,
  cpu: os.cpus()[0]?.model,
  node: process.version,
  platform: process.platform,
  results,
  samples,
  warmup: 100,
};
console.log(JSON.stringify(report, null, 2));
if (process.env.LAUNCH_REPORT_DIR) {
  await writeFile(
    `${process.env.LAUNCH_REPORT_DIR}/benchmark.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
