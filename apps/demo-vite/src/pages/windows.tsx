import type { Dashfoo } from "@dashfoo/core";
import { collectTabsets, findTabset, standaloneModel } from "@dashfoo/core";
import type { DashfooHandle, DashfooLayoutCommonProps, TearOffRequest } from "@dashfoo/react";
import { DashfooLayout } from "@dashfoo/react";
import { ExternalLink } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button, DemoStage } from "../components/demo-stage";
import { PlaceholderPanel } from "../components/placeholder-panel";
import { windowsModels } from "../models";

const DRAG_GROUP = "demo-windows";

/** Grouped layouts drag with the browser's drag and drop; ungrouped ones keep the pointer drag and its preview chip. */
const DRAG_MODES = new Map([
  ["Across windows", DRAG_GROUP],
  ["This window", undefined],
]);

const MIN_POPUP = { height: 280, width: 360 };

type Popup = { container: HTMLElement; id: string; model: Dashfoo; view: Window };

/** A popup starts blank, so it borrows the opener's stylesheets and theme. */
const adoptStyles = (target: Document): void => {
  for (const node of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    target.head.append(node.cloneNode(true));
  }

  target.documentElement.className = document.documentElement.className;
  target.documentElement.dataset.dashfooTheme = document.documentElement.dataset.dashfooTheme;
};

const openPopup = ({ model, point, size }: TearOffRequest): Popup | null => {
  const width = Math.max(MIN_POPUP.width, Math.round(size.width));
  const height = Math.max(MIN_POPUP.height, Math.round(size.height));

  const view = window.open(
    "",
    "",
    `popup,left=${point.x},top=${point.y},width=${width},height=${height}`,
  );

  if (!view) {
    return null;
  }

  view.document.title = "dashfoo window";
  adoptStyles(view.document);
  const container = view.document.createElement("div");
  container.className = "h-screen bg-surface-muted p-2 dark:bg-surface-inverse";
  view.document.body.style.margin = "0";
  view.document.body.append(container);

  return { container, id: crypto.randomUUID(), model, view };
};

/** The keyboard path to a tear-off: the active tab, opened near the window's corner. */
const popOutRequest = (model: Dashfoo): TearOffRequest | undefined => {
  const tabset = findTabset(model, model.activeTabsetId ?? "");
  const tab = tabset?.children[tabset.selected];
  const detached = tab && standaloneModel(model, tab.id);

  return (
    detached && {
      kind: "tab",
      model: detached,
      nodeId: tab.id,
      point: { x: window.screenX + 80, y: window.screenY + 80 },
      size: { height: 360, width: 480 },
    }
  );
};

const hasTabs = (model: Dashfoo): boolean =>
  collectTabsets(model).some((tabset) => tabset.children.length > 0);

type PopupLayoutProps = {
  layoutProps: Omit<DashfooLayoutCommonProps, "onTearOff">;
  onClose: (id: string) => void;
  onTearOff: (request: TearOffRequest) => boolean;
  popup: Popup;
};

/** Owns one popup window: closes it on unmount and drops it once the user closes it. */
const PopupLayout = ({ layoutProps, onClose, onTearOff, popup }: PopupLayoutProps): ReactNode => {
  const handlePageHide = useEffectEvent((): void => {
    onClose(popup.id);
  });

  const mounted = useRef(false);

  // StrictMode unmounts and remounts once on mount; only a cleanup that is not
  // followed by a remount means the page is gone and the window should close.
  useEffect(() => {
    mounted.current = true;
    popup.view.addEventListener("pagehide", handlePageHide);

    return () => {
      mounted.current = false;
      popup.view.removeEventListener("pagehide", handlePageHide);
      setTimeout(() => {
        if (!mounted.current) {
          popup.view.close();
        }
      }, 0);
    };
  }, [popup]);

  return createPortal(
    <DashfooLayout
      {...layoutProps}
      defaultModel={popup.model}
      onModelChange={(next) => {
        if (!hasTabs(next)) {
          popup.view.close();
        }
      }}
      onTearOff={onTearOff}
    />,
    popup.container,
  );
};

const WindowsPage = (): ReactNode => {
  const [initial] = useState(windowsModels);
  const [popups, setPopups] = useState<Array<Popup>>([]);
  const main = useRef<DashfooHandle>(null);

  const closePopup = useCallback((id: string): void => {
    setPopups((list) => list.filter((popup) => popup.id !== id));
  }, []);

  const handleTearOff = (request: TearOffRequest): boolean => {
    const popup = openPopup(request);

    if (!popup) {
      return false;
    }

    setPopups((list) => [...list, popup]);

    return true;
  };

  const handlePopOut = (): void => {
    const handle = main.current;

    if (!handle) {
      return;
    }

    const request = popOutRequest(handle.getModel());

    if (request && handleTearOff(request)) {
      handle.dispatch({ nodeId: request.nodeId, type: "tearOff" });
    }
  };

  const [dragMode, setDragMode] = useState("Across windows");

  const handleDragModeChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setDragMode(event.target.value);
  };

  const layoutProps = useMemo(
    () => ({ dragGroup: DRAG_MODES.get(dragMode), factory: PlaceholderPanel, floatable: true }),
    [dragMode],
  );

  return (
    <DemoStage
      actions={
        <>
          <label className="text-foreground-muted dark:text-foreground-disabled inline-flex items-center gap-1.5 text-xs">
            Drag
            <select
              className="border-border-default text-foreground-secondary dark:border-border-inverse-subtle dark:bg-surface-inverse dark:text-foreground-pale rounded-md border bg-white px-2 py-1.5 text-base sm:text-xs"
              onChange={handleDragModeChange}
              value={dragMode}
            >
              {[...DRAG_MODES.keys()].map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
          <Button icon={<ExternalLink size={14} />} onClick={handlePopOut}>
            Pop out active tab
          </Button>
        </>
      }
      description="Across windows, both layouts share a drag group: drag tabs or tabsets between them, into a float, or out of the browser window to open them in a popup, and back. This window keeps each layout to itself with the pointer drag, whose preview chip shows when a release would open a new window. A popup closes once its last tab leaves."
      title="Multiple windows"
    >
      <div className="grid h-full min-h-0 grid-cols-1 gap-3 md:grid-cols-2">
        <section aria-label="Main layout" className="min-h-0" data-testid="windows-main">
          <DashfooLayout
            {...layoutProps}
            defaultModel={initial.main}
            onTearOff={handleTearOff}
            ref={main}
          />
        </section>
        <section aria-label="Side layout" className="min-h-0" data-testid="windows-side">
          <DashfooLayout {...layoutProps} defaultModel={initial.side} onTearOff={handleTearOff} />
        </section>
      </div>
      {popups.map((popup) => (
        <PopupLayout
          key={popup.id}
          layoutProps={layoutProps}
          onClose={closePopup}
          onTearOff={handleTearOff}
          popup={popup}
        />
      ))}
    </DemoStage>
  );
};

export { WindowsPage };
