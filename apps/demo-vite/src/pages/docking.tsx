import type { DashfooHandle } from "@dashfoo/react";
import { DashfooDragProvider, DashfooLayout, useExternalTabSource } from "@dashfoo/react";
import { GripVertical, Plus, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { dockingModel } from "../models";
import type { WidgetDefinition } from "../widgets";
import { addTargetId, createWidgetTab, WIDGETS } from "../widgets";

// One marketplace entry: drag the card into the layout, or add it with the
// button (the keyboard path — pointer drag is the only drag input).
const WidgetCard = ({
  onAdd,
  widget,
}: {
  onAdd: (widget: WidgetDefinition) => void;
  widget: WidgetDefinition;
}): ReactNode => {
  const { ref } = useExternalTabSource({
    createTab: () => createWidgetTab(widget),
    label: widget.name,
  });
  const handleAdd = (): void => onAdd(widget);

  return (
    <div
      className="flex shrink-0 cursor-grab touch-none items-center gap-2 rounded-md border border-neutral-200 bg-white py-1.5 pr-1.5 pl-2.5 text-xs text-neutral-700 select-none"
      data-testid={`widget-${widget.component}`}
      ref={ref}
    >
      <GripVertical aria-hidden className="text-neutral-300" size={14} />
      <widget.icon aria-hidden size={14} strokeWidth={1.75} />
      <span className="md:flex-1">{widget.name}</span>
      <button
        aria-label={`Add ${widget.name}`}
        className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        onClick={handleAdd}
        type="button"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

const DockingPage = (): ReactNode => {
  const [resetKey, setResetKey] = useState(0);
  const layout = useRef<DashfooHandle>(null);

  const handleReset = (): void => {
    setResetKey((value) => value + 1);
  };

  const handleAddWidget = (widget: WidgetDefinition): void => {
    const handle = layout.current;
    if (!handle) {
      return;
    }
    const targetId = addTargetId(handle.getModel());
    if (targetId) {
      handle.addTab(createWidgetTab(widget), { location: "center", targetId });
    }
  };

  return (
    <DemoStage
      actions={
        <Button icon={<RotateCcw size={14} />} onClick={handleReset}>
          Reset layout
        </Button>
      }
      description="Drag a tab onto another strip to stack it, toward a tabset edge to split. Grow the dashboard from the widget list: drag a widget in (or add it with its button) and close its tab to remove it."
      title="Docking & widgets"
    >
      <DashfooDragProvider>
        <div className="flex h-full min-h-0 flex-col gap-3 md:flex-row">
          <aside
            aria-label="Widget list"
            className="flex shrink-0 gap-2 overflow-x-auto md:w-52 md:flex-col md:overflow-x-visible md:overflow-y-auto"
          >
            {WIDGETS.map((widget) => (
              <WidgetCard key={widget.component} onAdd={handleAddWidget} widget={widget} />
            ))}
          </aside>
          <div className="min-h-0 min-w-0 flex-1">
            <DashfooLayout
              defaultModel={dockingModel()}
              factory={renderPanel}
              key={resetKey}
              ref={layout}
            />
          </div>
        </div>
      </DashfooDragProvider>
    </DemoStage>
  );
};

export { DockingPage };
