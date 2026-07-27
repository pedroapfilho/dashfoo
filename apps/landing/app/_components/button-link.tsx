import type { ReactNode } from "react";

const BASE =
  "rounded-dashfoo focus-visible:outline-dashfoo-ring inline-flex items-center gap-2 py-2.5 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-sm";

// buttons.md: the icon side's horizontal padding matches the vertical padding.
const ICON_PADDING = {
  leading: "pr-5 pl-2.5",
  none: "px-5",
  trailing: "pr-2.5 pl-5",
} as const;

// transition-opacity, not a bare transition: opacity is outside
// interactivity.md's ban on transitioning color and background changes.
const VARIANTS = {
  primary: "bg-dashfoo-primary text-dashfoo-background transition-opacity hover:opacity-90",
  secondary: "border-dashfoo-border text-dashfoo-foreground hover:bg-dashfoo-muted border",
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
