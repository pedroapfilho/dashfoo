import type { ReactNode } from "react";

const LibLink = ({ children, href }: { children: ReactNode; href: string }): ReactNode => (
  <a
    className="decoration-dashfoo-border hover:text-dashfoo-foreground hover:decoration-dashfoo-foreground underline underline-offset-2 transition-colors"
    href={href}
    rel="noopener noreferrer"
    target="_blank"
  >
    {children}
  </a>
);

const RRP_URL = "https://github.com/bvaughn/react-resizable-panels";
const RGL_URL = "https://github.com/react-grid-layout/react-grid-layout";
const DNDKIT_URL = "https://github.com/clauderic/dnd-kit";
const XSTATE_URL = "https://github.com/statelyai/xstate";
const ZOD_URL = "https://github.com/colinhacks/zod";

export { DNDKIT_URL, LibLink, RGL_URL, RRP_URL, XSTATE_URL, ZOD_URL };
