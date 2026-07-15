import type { Dashfoo } from "@dashfoo/core";
import type { DashfooHandle } from "@dashfoo/react";
import { DashfooLayout } from "@dashfoo/react";
import { Plus, Redo2, Undo2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { playgroundModel } from "../models";
import type { WidgetDefinition } from "../widgets";
import { addTargetId, addWidget, closeActiveTab, WIDGETS } from "../widgets";

type View = { canRedo: boolean; canUndo: boolean; model: Dashfoo };

const ImperativeControlPage = (): ReactNode => {
  const initial = useMemo(() => playgroundModel(), []);
  const layout = useRef<DashfooHandle>(null);
  const [view, setView] = useState<View>({ canRedo: false, canUndo: false, model: initial });

  const handleModelChange = useCallback((model: Dashfoo): void => {
    setView({
      canRedo: layout.current?.canRedo() ?? false,
      canUndo: layout.current?.canUndo() ?? false,
      model,
    });
  }, []);

  const handleAddWidget = useCallback((widget: WidgetDefinition): void => {
    addWidget(layout.current, widget);
  }, []);

  const handleCloseActive = useCallback((): void => {
    closeActiveTab(layout.current);
  }, []);

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
          layout.current?.redo();
        } else {
          layout.current?.undo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const hasTabs = addTargetId(view.model) !== undefined;

  return (
    <DemoStage
      actions={
        <>
          <Button
            disabled={!view.canUndo}
            icon={<Undo2 size={14} />}
            onClick={() => layout.current?.undo()}
          >
            Undo
          </Button>
          <Button
            disabled={!view.canRedo}
            icon={<Redo2 size={14} />}
            onClick={() => layout.current?.redo()}
          >
            Redo
          </Button>
        </>
      }
      description="DashfooLayout exposes an imperative handle via ref: addTab and closeTab drive the widget buttons below, undo/redo and ⌘Z / ⇧⌘Z drive the engine's own history; no external state is rebuilt. The live model is mirrored in the inspector."
      title="Imperative control & history"
    >
      <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
        <div className="flex shrink-0 flex-wrap content-start items-start gap-2 lg:w-44 lg:flex-col lg:flex-nowrap lg:overflow-y-auto">
          {WIDGETS.map((widget) => (
            <Button
              icon={<Plus size={14} />}
              key={widget.component}
              onClick={() => handleAddWidget(widget)}
            >
              {widget.name}
            </Button>
          ))}
          <Button disabled={!hasTabs} icon={<X size={14} />} onClick={handleCloseActive}>
            Close active tab
          </Button>
        </div>
        <div className="min-h-0 min-w-0 flex-1">
          <DashfooLayout
            defaultModel={initial}
            factory={renderPanel}
            onModelChange={handleModelChange}
            ref={layout}
            responsive={{ maxWidth: 720 }}
          />
        </div>
        <pre className="hidden w-80 shrink-0 overflow-auto rounded-lg border border-neutral-200 bg-white p-3 text-[10px] leading-relaxed text-neutral-500 xl:block dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          {JSON.stringify(view.model, null, 2)}
        </pre>
      </div>
    </DemoStage>
  );
};

export { ImperativeControlPage };
