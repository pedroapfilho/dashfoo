import type { Dashfoo } from "@dashfoo/core";
import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { playgroundModel } from "../models";

type History = { future: Array<Dashfoo>; past: Array<Dashfoo>; present: Dashfoo };

const ControlledPage = (): ReactNode => {
  const initial = useMemo(() => playgroundModel(), []);
  const [history, setHistory] = useState<History>(() => ({
    future: [],
    past: [],
    present: initial,
  }));

  const handleChange = useCallback((model: Dashfoo): void => {
    setHistory((current) => ({
      future: [],
      past: [...current.past, current.present],
      present: model,
    }));
  }, []);

  const handleUndo = useCallback((): void => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) {
        return current;
      }
      return {
        future: [current.present, ...current.future],
        past: current.past.slice(0, -1),
        present: previous,
      };
    });
  }, []);

  const handleRedo = useCallback((): void => {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) {
        return current;
      }
      return {
        future: current.future.slice(1),
        past: [...current.past, current.present],
        present: next,
      };
    });
  }, []);

  // ⌘Z / ⇧⌘Z, ignored while typing (e.g. renaming a tab).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleRedo, handleUndo]);

  return (
    <DemoStage
      actions={
        <>
          <Button disabled={history.past.length === 0} onClick={handleUndo}>
            Undo
          </Button>
          <Button disabled={history.future.length === 0} onClick={handleRedo}>
            Redo
          </Button>
        </>
      }
      description="The layout is fully controlled: every change flows out through onModelChange into external state, with undo/redo (⌘Z / ⇧⌘Z) kept by this page. The model is the single source of truth — mirrored live in the inspector."
      title="Controlled & history"
    >
      <div className="flex h-full min-h-0 gap-3 px-6 pb-6">
        <div className="min-h-0 min-w-0 flex-1">
          <DashfooLayout
            factory={renderPanel}
            model={history.present}
            onModelChange={handleChange}
          />
        </div>
        <pre className="rounded-df border-df-border bg-df-surface text-df-muted hidden w-80 shrink-0 overflow-auto border p-3 text-[10px] leading-relaxed lg:block">
          {JSON.stringify(history.present, null, 2)}
        </pre>
      </div>
    </DemoStage>
  );
};

export { ControlledPage };
