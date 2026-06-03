import type { ReactNode } from "react";

const Button = ({
  children,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}): ReactNode => (
  <button
    className="border-df-border bg-df-surface text-df-text hover:border-df-border-strong rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

// A titled stage that hosts a dashfoo layout in a fill-height box.
const DemoStage = ({
  actions,
  children,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  title: string;
}): ReactNode => (
  <div className="flex h-full min-h-0 flex-col">
    <header className="flex items-start justify-between gap-4 px-6 py-4">
      <div>
        <h1 className="text-df-text text-sm font-semibold">{title}</h1>
        <p className="text-df-muted mt-1 max-w-2xl text-xs leading-relaxed">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
    <div className="min-h-0 flex-1">{children}</div>
  </div>
);

export { Button, DemoStage };
