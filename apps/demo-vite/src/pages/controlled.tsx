import type { Dashfoo } from "@dashfoo/core";
import type { DashfooHandle } from "@dashfoo/react";
import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { playgroundModel } from "../models";

type View = { canRedo: boolean; canUndo: boolean; model: Dashfoo };

const ImperativeControlPage = (): ReactNode => {
  const initial = useMemo(() => playgroundModel(), []);
  const layout = useRef<DashfooHandle>(null);
  const [view, setView] = useState<View>({ canRedo: false, canUndo: false, model: initial });

  // Read history flags off the handle at change time (an event, not render).
  const handleModelChange = useCallback((model: Dashfoo): void => {
    setView({
      canRedo: layout.current?.canRedo() ?? false,
      canUndo: layout.current?.canUndo() ?? false,
      model,
    });
  }, []);

  const handleUndo = useCallback((): void => {
    layout.current?.undo();
  }, []);

  const handleRedo = useCallback((): void => {
    layout.current?.redo();
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
          <Button disabled={!view.canUndo} onClick={handleUndo}>
            Undo
          </Button>
          <Button disabled={!view.canRedo} onClick={handleRedo}>
            Redo
          </Button>
        </>
      }
      description="DashfooLayout exposes an imperative handle via ref — undo/redo, getModel, addTab, maximizeTabset, and more. These buttons and ⌘Z / ⇧⌘Z drive the engine's own history; no external state is rebuilt. The live model is mirrored in the inspector."
      title="Imperative control & history"
    >
      <div className="flex h-full min-h-0 gap-3">
        <div className="min-h-0 min-w-0 flex-1">
          <DashfooLayout
            defaultModel={initial}
            factory={renderPanel}
            onModelChange={handleModelChange}
            ref={layout}
          />
        </div>
        <pre className="rounded-df border-df-border bg-df-surface text-df-muted hidden w-80 shrink-0 overflow-auto border p-3 text-[10px] leading-relaxed lg:block">
          {JSON.stringify(view.model, null, 2)}
        </pre>
      </div>
    </DemoStage>
  );
};

export { ImperativeControlPage };
