import type { ReactNode } from "react";

import { buttonClassName, type ButtonStyleProps } from "./button-styles";

type ButtonLinkProps = ButtonStyleProps & {
  children: ReactNode;
  external?: boolean;
  href: string;
};

const ButtonLink = ({
  children,
  external = false,
  href,
  icon,
  variant,
}: ButtonLinkProps): ReactNode => (
  <a
    className={buttonClassName({ icon, variant })}
    href={href}
    rel={external ? "noopener noreferrer" : undefined}
    target={external ? "_blank" : undefined}
  >
    {children}
  </a>
);

export { ButtonLink };
