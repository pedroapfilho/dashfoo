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
    className="border-border-default text-foreground-secondary hover:border-border-strong dark:border-border-inverse-subtle dark:bg-surface-inverse dark:text-foreground-pale dark:hover:border-border-inverse inline-flex min-h-11 items-center gap-1.5 rounded-md border bg-white px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {icon}
    {children}
  </button>
);

const DemoStage = ({
  actions,
  children,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description: ReactNode;
  title: string;
}): ReactNode => (
  <div className="flex h-full min-h-0 flex-col">
    <header className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6">
      <div>
        <h1 className="text-foreground-primary dark:text-foreground-inverse text-base font-semibold sm:text-sm">
          {title}
        </h1>
        <p className="text-foreground-muted dark:text-foreground-disabled mt-1 max-w-2xl text-sm leading-relaxed sm:text-xs">
          {description}
        </p>
      </div>
      {actions !== undefined && actions !== null ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
    <div className="min-h-0 flex-1 px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>
  </div>
);

export { Button, DemoStage };
