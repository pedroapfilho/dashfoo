"use client";

import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useMemo, useSyncExternalStore } from "react";

import { showcaseModel } from "./model";
import { renderPanel } from "./panels";

const noopSubscribe = (): (() => void) => () => {};

// True only after the component runs in the browser. Server render and the first
// client render both return false (matching markup, no hydration mismatch); the
// store flips to true once mounted.
const useIsClient = (): boolean =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

// A real, draggable DashfooLayout — not a screenshot. It owns a DOM-bound
// @dnd-kit drag manager, so it must mount client-side only: server-rendering the
// chrome ships markup that can fail to hydrate (and stay dead) in some browsers.
// Rendering after mount guarantees the manager exists and the handlers attach.
// Uncontrolled (no persist) so every visit starts from the same arrangement.
const LiveDemo = (): ReactNode => {
  const isClient = useIsClient();
  const defaultModel = useMemo(() => showcaseModel(), []);

  if (!isClient) {
    return (
      <div
        aria-hidden="true"
        className="bg-dashfoo-muted size-full rounded-sm motion-safe:animate-pulse"
      />
    );
  }

  return <DashfooLayout defaultModel={defaultModel} factory={renderPanel} />;
};

export { LiveDemo };
