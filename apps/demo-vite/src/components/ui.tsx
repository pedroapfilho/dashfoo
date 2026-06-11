import type { ReactNode } from "react";

const Button = ({
  children,
  disabled = false,
  icon,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  onClick: () => void;
}): ReactNode => (
  <button
    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 transition-colors hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {icon}
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
        <h1 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
    <div className="min-h-0 flex-1 px-6 pb-6">{children}</div>
  </div>
);

export { Button, DemoStage };
