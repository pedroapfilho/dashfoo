import Image from "next/image";
import type { ReactNode } from "react";

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
