import type { CSSProperties, ReactNode } from "react";

const iconStyle: CSSProperties = { pointerEvents: "none" };

const Icon = ({ children }: { children: ReactNode }): ReactNode => (
  <svg
    aria-hidden="true"
    fill="none"
    height="12"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    style={iconStyle}
    viewBox="0 0 24 24"
    width="12"
  >
    {children}
  </svg>
);

const CloseIcon = (): ReactNode => (
  <Icon>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);

const GripIcon = (): ReactNode => (
  <Icon>
    <circle cx="12" cy="5" r="1" />
    <circle cx="19" cy="5" r="1" />
    <circle cx="5" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
    <circle cx="19" cy="19" r="1" />
    <circle cx="5" cy="19" r="1" />
  </Icon>
);

const MaximizeIcon = ({ maximized }: { maximized: boolean }): ReactNode =>
  maximized ? (
    <Icon>
      <path d="m14 10 7-7" />
      <path d="M20 10h-6V4" />
      <path d="m3 21 7-7" />
      <path d="M4 14h6v6" />
    </Icon>
  ) : (
    <Icon>
      <path d="M15 3h6v6" />
      <path d="m21 3-7 7" />
      <path d="m3 21 7-7" />
      <path d="M9 21H3v-6" />
    </Icon>
  );

const FloatIcon = (): ReactNode => (
  <Icon>
    <rect height="14" rx="2" width="18" x="3" y="6" />
    <path d="M3 10h18" />
  </Icon>
);

const MinimizeIcon = (): ReactNode => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
);

const DockIcon = (): ReactNode => (
  <Icon>
    <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2" />
    <path d="M11 8 7 12l4 4" />
    <path d="M7 12h10" />
  </Icon>
);

export { CloseIcon, DockIcon, FloatIcon, GripIcon, MaximizeIcon, MinimizeIcon };
