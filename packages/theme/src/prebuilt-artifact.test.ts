import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const artifact = await readFile(join(import.meta.dirname, "../dist/dashfoo.css"), "utf8");

describe("dist/dashfoo.css", () => {
  test("contains the design tokens and dark remap", () => {
    expect(artifact).toContain("--dashfoo-background:");
    expect(artifact).toContain('[data-dashfoo-theme="dark"]');
  });

  test("contains the skin rules", () => {
    expect(artifact).toContain('[data-dashfoo="tabset"]');
    expect(artifact).toContain('[data-dashfoo="drag-preview"]');
  });

  test("sizes the rrp separators so gutters cannot collapse", () => {
    const vertical = /\[data-separator\]\[aria-orientation="vertical"\]\s*\{[^\}]*\}/v.exec(
      artifact,
    )?.[0];
    expect(vertical).toContain("width: var(--dashfoo-splitter-size)");
    const horizontal = /\[data-separator\]\[aria-orientation="horizontal"\]\s*\{[^\}]*\}/v.exec(
      artifact,
    )?.[0];
    expect(horizontal).toContain("height: var(--dashfoo-splitter-size)");
  });

  test("ships the magnetic-snap highlight token and rule", () => {
    expect(artifact).toContain("--dashfoo-snap:");
    const snapped = /\[data-separator\]\[data-dashfoo-snapped="true"\]::before\s*\{[^\}]*\}/v.exec(
      artifact,
    )?.[0];
    expect(snapped).toContain("background: var(--dashfoo-snap)");
  });

  test("ships the snap glide transition gated on the snapping group", () => {
    const glide =
      /\[data-dashfoo="row"\]\[data-dashfoo-snapping="true"\] > \[data-panel\]\s*\{[^\}]*\}/v.exec(
        artifact,
      )?.[0];
    expect(glide).toContain("transition: var(--dashfoo-snap-transition");

    const reduced = /prefers-reduced-motion: reduce[^@]*/v.exec(artifact)?.[0];
    expect(reduced).toContain("--dashfoo-snap-transition: none");
  });

  test("keeps disabled separators sized but drops their resize cues", () => {
    expect(artifact).toContain('[data-separator="disabled"][aria-orientation]');

    const pill = /\[data-separator="disabled"\]::before\s*\{[^\}]*\}/v.exec(artifact)?.[0];
    expect(pill).toContain("display: none");
  });

  test("ships unlayered with zero Tailwind leakage", () => {
    expect(artifact).not.toContain("@layer");
    expect(artifact).not.toContain("@theme");
    expect(artifact).not.toContain("--color-dashfoo");

    expect(artifact).not.toContain("::file-selector-button");
    expect(artifact).not.toContain("--spacing");
  });
});
