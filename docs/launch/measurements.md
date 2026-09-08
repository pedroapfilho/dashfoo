# Release-candidate measurements

Measured 2026-09-08 on macOS arm64, Apple M5 Max, Node 24.20.0 and pnpm 11.13.1.
These are local observations, not performance guarantees or comparisons with other libraries.
Raw reports: [consumers](consumers.json), [core operations](benchmark.json),
[browser workloads](browser-workloads.json).

## Reproduce

```sh
pnpm build --filter='./packages/*'
LAUNCH_REPORT_DIR="$PWD/docs/launch" pnpm test:consumers
LAUNCH_REPORT_DIR="$PWD/docs/launch" node scripts/launch/benchmark.mjs
```

Install Chromium first with `pnpm exec playwright install chromium`.
The consumer runner packs release artifacts and copies starters to disposable directories
outside the workspace. It installs using npm/pnpm, exercises packaged hydration,
StrictMode/ref cleanup and browser interactions, then builds the application.
The Tailwind source entry is also compiled from its packed package.
Dependency ranges are resolved at run time; future transitive versions can change results.

## Incremental consumer JavaScript

Vite 8.2.2 production builds. Sum of gzip bytes for all generated JavaScript chunks,
compared with the same consumer rebuilt with only React and a paragraph. The full
starter includes theme imports, notes state, persistence, floats and responsive behavior.
CSS, source maps and HTML are excluded. These numbers include transitive dependencies
and starter code; they are not a claim about the smallest possible Dashfoo import.

| React  | Manager | Full starter | React baseline | Increment |
| ------ | ------- | -----------: | -------------: | --------: |
| 18.3.1 | npm     |    136.8 KiB |       44.0 KiB |  92.8 KiB |
| 19.2.7 | pnpm    |    151.5 KiB |       57.9 KiB |  93.7 KiB |

## Core operations

500 samples after 100 warmups per operation and size. Each invocation starts from
the same model: one source tabset containing count minus one tabs and one target
tabset containing a single tab. Dock splits the first source tab below the target.
Roundtrip serializes and parses through the validated public API. No browser or
widget rendering is included. Times are milliseconds, median / p95.

| Total tabs |        Rename | Directional dock | JSON roundtrip | Serialized bytes |
| ---------: | ------------: | ---------------: | -------------: | ---------------: |
|         10 | 0.005 / 0.006 |    0.008 / 0.015 |  0.035 / 0.090 |              938 |
|         50 | 0.016 / 0.016 |    0.020 / 0.039 |  0.108 / 0.202 |             3815 |
|        100 | 0.029 / 0.030 |    0.034 / 0.041 |  0.241 / 0.528 |             7415 |

## Browser tab-selection workload

Chromium 151.0.7922.34, React 19.2.7 production build, 1280 × 800 viewport,
no CPU or network throttling. Five tabsets, `keepMounted` enabled, every tab
containing a label and input. 100 selections after 20 warmups, cycling through
the first tabset. The fixture measures `flushSync` through the React DOM commit;
it excludes subsequent paint, GPU work and realistic editor/chart costs.

| Total tabs | Selection commit median |     p95 | Single initial commit |
| ---------: | ----------------------: | ------: | --------------------: |
|         10 |                 0.80 ms | 1.20 ms |              18.00 ms |
|         50 |                 2.00 ms | 2.50 ms |               7.40 ms |
|        100 |                 3.10 ms | 3.80 ms |               9.90 ms |

Initial commit is one observation per size, ordered 10, 50, 100; cold-start and
JIT effects make those values unsuitable for scaling comparisons. This harness
does not measure drag-frame rate, input-to-paint latency, memory growth, mobile
hardware, expensive widgets or simultaneous users. Profile your own application.
