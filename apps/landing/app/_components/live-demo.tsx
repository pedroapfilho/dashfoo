"use client";

import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useMemo, useSyncExternalStore } from "react";

import { showcaseModel } from "./model";
import { renderPanel } from "./panels";

const noopSubscribe = (): (() => void) => () => {};

const useIsClient = (): boolean =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

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

  return (
    <DashfooLayout
      defaultModel={defaultModel}
      factory={renderPanel}
      responsive={{ maxWidth: 720 }}
    />
  );
};

export { LiveDemo };
