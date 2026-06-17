import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

// Guards the compiled zero-build artifact: tokens + skin must survive the
// Tailwind CLI build, and nothing Tailwind-specific (layers, preflight,
// default theme vars, @theme mirrors) may leak into non-Tailwind pages.
// Requires the package build to have run first (turbo: @dashfoo/theme#test
// depends on build).
const artifact = readFileSync(join(import.meta.dirname, "../dist/dashfoo.css"), "utf8");

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
    const vertical = artifact.match(
      /\[data-separator\]\[aria-orientation="vertical"\]\s*\{[^\}]*\}/v,
    )?.[0];
    expect(vertical).toContain("width: var(--dashfoo-splitter-size)");
    const horizontal = artifact.match(
      /\[data-separator\]\[aria-orientation="horizontal"\]\s*\{[^\}]*\}/v,
    )?.[0];
    expect(horizontal).toContain("height: var(--dashfoo-splitter-size)");
  });

  test("ships the magnetic-snap highlight token and rule", () => {
    expect(artifact).toContain("--dashfoo-snap:");
    const snapped = artifact.match(
      /\[data-separator\]\[data-dashfoo-snapped="true"\]::before\s*\{[^\}]*\}/v,
    )?.[0];
    expect(snapped).toContain("background: var(--dashfoo-snap)");
  });

  test("ships the snap glide transition gated on the snapping group", () => {
    const glide = artifact.match(
      /\[data-dashfoo="row"\]\[data-dashfoo-snapping="true"\] > \[data-panel\]\s*\{[^\}]*\}/v,
    )?.[0];
    expect(glide).toContain("transition: var(--dashfoo-snap-transition");
    // Disabled under reduced motion alongside the dock indicator.
    const reduced = artifact.match(/prefers-reduced-motion: reduce[^@]*/v)?.[0];
    expect(reduced).toContain("--dashfoo-snap-transition: none");
  });

  test("keeps disabled separators sized but drops their resize cues", () => {
    // Static layouts disable the separator; it must keep the gutter rules above
    // while the doubled-attribute cursor override survives the build.
    expect(artifact).toContain('[data-separator="disabled"][aria-orientation]');
    // The grab pill is hidden entirely on disabled separators.
    const pill = artifact.match(/\[data-separator="disabled"\]::before\s*\{[^\}]*\}/v)?.[0];
    expect(pill).toContain("display: none");
  });

  test("ships unlayered with zero Tailwind leakage", () => {
    expect(artifact).not.toContain("@layer");
    expect(artifact).not.toContain("@theme");
    expect(artifact).not.toContain("--color-dashfoo");
    // Preflight and default-theme markers.
    expect(artifact).not.toContain("::file-selector-button");
    expect(artifact).not.toContain("--spacing");
  });
});
