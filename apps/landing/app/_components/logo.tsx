import Image from "next/image";
import type { ReactNode } from "react";

// The existing dashfoo brand mark — light variant in light mode, dark variant
// in dark mode (the dark: variant keys off data-dashfoo-theme on <html>).
const Logo = ({ className = "h-6 w-auto" }: { className?: string }): ReactNode => (
  <>
    <Image
      alt="dashfoo"
      className={`${className} dark:hidden`}
      height={24}
      priority
      src="/dashfoo-logo-light.svg"
      width={126}
    />
    <Image
      alt="dashfoo"
      className={`${className} not-dark:hidden`}
      height={24}
      priority
      src="/dashfoo-logo-dark.svg"
      width={126}
    />
  </>
);

export { Logo };
