import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

const Layout = ({ children }: { children: ReactNode }) => (
  <DocsLayout {...baseOptions()} tree={source.pageTree}>
    {children}
  </DocsLayout>
);

export default Layout;
