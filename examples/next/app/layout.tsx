import "@dashfoo/theme/dashfoo.css";
import "./globals.css";

import type { ReactNode } from "react";

const RootLayout = ({ children }: { children: ReactNode }): ReactNode => (
  <html lang="en">
    <body>{children}</body>
  </html>
);
export default RootLayout;
