import type { ReactNode } from "react";

const BASE =
  "rounded-dashfoo inline-flex items-center gap-2 py-2.5 font-mono text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-sm";

const ICON_PADDING = {
  leading: "pr-5 pl-2.5",
  none: "px-5",
  trailing: "pr-2.5 pl-5",
} as const;

const VARIANTS = {
  primary: "bg-primary text-primary-foreground transition-opacity hover:opacity-90",
  secondary: "border border-border text-foreground hover:bg-muted",
} as const;

type ButtonLinkProps = {
  children: ReactNode;
  external?: boolean;
  href: string;
  icon?: keyof typeof ICON_PADDING;
  variant?: keyof typeof VARIANTS;
};

const ButtonLink = ({
  children,
  external = false,
  href,
  icon = "none",
  variant = "secondary",
}: ButtonLinkProps): ReactNode => (
  <a
    className={`${BASE} ${ICON_PADDING[icon]} ${VARIANTS[variant]}`}
    href={href}
    rel={external ? "noopener noreferrer" : undefined}
    target={external ? "_blank" : undefined}
  >
    {children}
  </a>
);

export { ButtonLink };
