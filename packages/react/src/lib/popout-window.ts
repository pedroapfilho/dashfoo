"use client";

import type { Geometry } from "@dashfoo/core";

// DOM plumbing for detached windows: the popup's feature string, mirroring the
// host document's styles into the child (dashfoo ships no CSS, so the consumer's
// stylesheets must be copied across), and measuring a source element so the popup
// opens roughly where the panel was. The only place window.open / document
// surgery lives — the React adapter stays declarative on top of it.

const MIN_WINDOW_WIDTH = 360;
const MIN_WINDOW_HEIGHT = 240;
const DEFAULT_WINDOW_WIDTH = 640;
const DEFAULT_WINDOW_HEIGHT = 480;

// Marks the stylesheets we cloned in, so re-syncing can clear and rebuild only
// our own copies without touching anything the popup added itself.
const SYNCED_ATTR = "data-dashfoo-synced";
const STYLE_SELECTOR = 'style, link[rel="stylesheet"]';

const featuresFromGeometry = (geometry: Geometry): string =>
  [
    "popup=yes",
    `width=${Math.round(geometry.width)}`,
    `height=${Math.round(geometry.height)}`,
    `left=${Math.round(geometry.left)}`,
    `top=${Math.round(geometry.top)}`,
  ].join(",");

// Roughly where the source panel sits on screen, so the popup opens over it.
// screenX/screenY + the client rect ignores browser chrome height but lands close
// enough; the popup is draggable afterward.
const measureGeometry = (element: Element | null): Geometry => {
  const rect = element?.getBoundingClientRect();
  const width = Math.max(MIN_WINDOW_WIDTH, Math.round(rect?.width ?? DEFAULT_WINDOW_WIDTH));
  const height = Math.max(MIN_WINDOW_HEIGHT, Math.round(rect?.height ?? DEFAULT_WINDOW_HEIGHT));
  const left = Math.round(window.screenX + (rect?.left ?? 80));
  const top = Math.round(window.screenY + (rect?.top ?? 80));
  return { height, left, top, width };
};

const copyStyleNodes = (source: Document, target: Document): void => {
  for (const synced of target.head.querySelectorAll(`[${SYNCED_ATTR}]`)) {
    synced.remove();
  }
  for (const node of source.querySelectorAll(STYLE_SELECTOR)) {
    const clone = node.cloneNode(true) as Element;
    clone.setAttribute(SYNCED_ATTR, "");
    target.head.append(clone);
  }
};

// Prepare a freshly-opened popup: mirror the host's <html>/<body> attributes (so
// theme classes and color-scheme apply), copy the stylesheets, and keep them in
// sync as the host injects more (Vite/HMR add <style> tags at runtime). Returns a
// disposer that stops observing.
const initPopoutDocument = (popup: Window, title: string): (() => void) => {
  const doc = popup.document;
  const host = document;

  doc.title = title;
  doc.documentElement.className = host.documentElement.className;
  doc.documentElement.style.cssText = host.documentElement.style.cssText;
  doc.documentElement.style.height = "100%";
  doc.body.className = host.body.className;
  doc.body.style.cssText = host.body.style.cssText;
  doc.body.style.margin = "0";
  doc.body.style.height = "100%";

  copyStyleNodes(host, doc);

  // Coalesce bursts of mutations (a single HMR update touches many nodes) into one
  // re-copy on the microtask queue.
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) {
      return;
    }
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!popup.closed) {
        copyStyleNodes(host, doc);
      }
    });
  });
  observer.observe(host.head, { attributes: true, childList: true, subtree: true });

  return () => {
    observer.disconnect();
  };
};

export { featuresFromGeometry, initPopoutDocument, measureGeometry };
