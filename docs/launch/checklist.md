# Early-adopter release checklist

Candidate: the commit containing this checklist, based on commit
`14b0cfee07f0810d31b20d3879d4d4774c2418f8` (`origin/main` at review start).
Resolve the exact candidate SHA with `git rev-parse HEAD` in the PR checkout.
Source and packed-artifact checks use core **1.1.0**, React **0.8.0**, theme **0.2.2**,
with patch changes pending in `.changeset/launch-readiness.md`. These are candidate
builds of those source versions, not newly published npm versions. Changesets must
assign final versions before release; repeat the gates on the resulting commit.

Decision: **engineering review candidate**. Publication, production deployment and
announcement submission are separate release actions. Do not announce against an
older production deployment or an unverified package version.

## Feature and documentation review

| Area                                           | Implementation / regression evidence                                                                                                                               | Documentation and bounds                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Select, close, rename, overflow, maximize      | React composition/rename tests; Chromium chrome and overflow suites; sole-tab rename semantics and focus regression                                                | Core/React READMEs; concepts and API guides. Close controls remain outside the semantic tablist. Content refs identify the active pane.                      |
| Directional docking, tabsets, external widgets | Full Chromium docking, insertion, edge, self-dock, static and widget suites; Firefox/WebKit smoke                                                                  | Drag guide. Pointer-only; no keyboard docking.                                                                                                               |
| Split sizing, constraints, snapping            | Core geometry/snap tests; Chromium sizing and snap suites; Firefox/WebKit resize smoke                                                                             | Model/API/theming guides. Separator dimensions come from consumer CSS or theme.                                                                              |
| In-app floats                                  | Core reducer tests; Chromium float move/resize/rename/occlusion suites; three-browser float/reload/dock smoke                                                      | Floating guide and current ADR notes. No native browser windows.                                                                                             |
| Controlled state and history                   | Store/imperative tests; controlled demo; packaged undo after restoration                                                                                           | Controlled/history guide. Applications own history in controlled mode.                                                                                       |
| Persistence                                    | SSR/hydration regression with saved data; StrictMode one-time restoration; corrupt and throwing adapters; debounce/reset/unload tests; packaged runtime and reload | Persistence guide. Restore after hydration, no restore action/save/undo. Widget content is not serialized.                                                   |
| Responsive/static layouts                      | Chromium responsive/static tests; nested-input identity regression; packaged mobile/desktop state checks; React 18 observer lifecycle regression                   | Responsive guide. Compact mode prevents restructuring. Built-in projection preserves ordinary nested panel identity; maximized/reparented views may remount. |
| Inactive panels                                | Keep-alive tests; stateful Notes demo and both packaged React consumers                                                                                            | `keepMounted` is opt-in. Cross-tabset moves can remount; durable application state belongs outside widgets.                                                  |
| Composition and refs                           | Compound component suites; packaged DOM refs and cleanup on React 18.3.1/19.2.7; raw demo axe                                                                      | Composition guide and React README. Styling attributes retained; semantic tablist owns trigger IDs inside the scrolling viewport.                            |
| Theme entry points                             | Packed prebuilt CSS renders in Vite/Next; packed Tailwind v4 source compiles                                                                                       | Theme README and theming guide. Light/dark, structural inline styles, optional visual skin.                                                                  |

All 12 canonical guides reviewed: introduction, getting started, concepts, the
model, drag/dock, controlled/history, composition, persistence, responsive,
floating panels, theming and API reference. Root and all three package READMEs
were checked against exports and installed package behavior. The getting-started
path now includes theme installation, a sized parent, registry content and client
boundaries. Stale counts/imports/source links and floating exclusions were corrected.

All five ADRs reviewed. ADRs 0001, 0002 and 0005 mark superseded scope, state-layer,
and drag-adapter decisions explicitly; ADR 0004 distinguishes its historical
markup table from current composition. ADR 0003's structuredClone decision stands.

## Release-candidate gates

| Gate                                     | Result                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`                            | PASS: 23 Turbo tasks plus launch-tooling and standalone-example lint; 231 core and 193 React tests                                                                        |
| `pnpm format:check`                      | PASS                                                                                                                                                                      |
| `pnpm fallow:dead`                       | PASS                                                                                                                                                                      |
| `pnpm --filter demo-vite test:e2e`       | PASS: 74 checks (68 Chromium, 3 Firefox, 3 WebKit)                                                                                                                        |
| `pnpm --filter docs test:e2e`            | PASS: 2 instant-navigation checks                                                                                                                                         |
| `pnpm test:sites`                        | PASS: 10 checks, including both themes at 390/1440, all guide/Markdown routes, copy/search/anchors/navigation, metadata endpoints and axe                                 |
| `pnpm test:consumers`                    | PASS: Vite + npm + React 18.3.1; Vite + pnpm + React 19.2.7; Next 16.3.4 + npm + React 19.2.7; production browser interaction and packaged StrictMode/hydration/ref tests |
| `pnpm exec changeset status`             | PASS: core 1.1.1, React 0.8.1, theme 0.2.3 planned; private site notes separated from package releases                                                                    |
| publint `--strict`                       | PASS: core, React, theme                                                                                                                                                  |
| are-the-types-wrong `--profile esm-only` | PASS: all three packages; CSS-only exports excluded; CommonJS intentionally unsupported                                                                                   |
| Production visual review                 | Desktop/mobile, light/dark across landing, docs and demo; contrast, semantics, overflow and named controls checked                                                        |
| Measurements                             | [Reproducible bundle and 10/50/100-tab measurements](measurements.md); no comparative performance claim                                                                   |

Browser matrix: full suite on Playwright Chromium 151.0.7922.34; focused docking, split
resize, floats, persistence, keyboard selection and composition semantics on
Playwright Firefox 153.0 and WebKit 26.5. This is desktop-engine automation plus narrow/touch-oriented
layout checks, not certification on physical iOS/Android devices or every browser
release. Axe is evidence, not a blanket accessibility guarantee; custom chrome
and assistive-technology workflows need application-specific evaluation.

## Launch kit and public paths

- [Show HN introduction](announcement.md), [FAQ](faq.md), [release notes](release-notes.md).
- [Recording and screenshots](assets/README.md), captured locally from candidate code using sample data.
- [Vite starter](../../examples/vite/README.md) and [Next.js starter](../../examples/next/README.md), runnable outside the workspace with npm or pnpm.
- GitHub Issues templates for bugs, questions and feature requests; [contributing](../../CONTRIBUTING.md) and [support](../../SUPPORT.md) guidance.
- Public landing, getting-started docs, demo and GitHub were reachable on 2026-09-08. Apex redirects to `www`; landing canonical, robots and sitemap use `https://www.dashfoo.com`. GitHub homepage now points there.
- Local social-preview routes return images. npm's website rejects automated requests with 403; the npm registry reports core 1.1.0, React 0.8.0 and theme 0.2.2; packed installs passed. Public sites still need the candidate deployed before final announcement verification.

## Final release actions and go/no-go

- [ ] Merge/version a reviewed candidate, record its exact SHA and final core/React/theme versions here or in the release record.
- [ ] Re-run every gate above on that commit; confirm no unresolved launch-blocking defect.
- [ ] Publish packages with the existing Changesets/provenance workflow.
- [ ] Install the exact published versions in both starters without local tarball overrides.
- [ ] Deploy the candidate sites, then verify public guide/demo links, mobile navigation, metadata, canonical URLs and social images.
- [ ] Confirm launch assets and release notes match the deployed/published candidate.
- [ ] Submit the announcement after these checks pass.

Any broken installation, hydration/data-loss defect, inaccessible primary control,
failed required check or broken public launch destination is a **no-go**. Known
product boundaries (pointer-only docking, no native-window popouts, ESM-only,
application-owned widget data/migrations and early-adopter API evolution) are
published limitations, not hidden launch blockers. No stable React 1.0 promise,
support SLA or launch date is introduced by this candidate.

Candidate tarballs are retained locally in `.context/release/`; their filenames and SHA-256 digests are recorded in [consumers.json](consumers.json). They are for review and standalone validation, not public distribution.
