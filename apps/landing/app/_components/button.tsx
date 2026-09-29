import type { ReactNode } from "react";

import { buttonClassName, type ButtonStyleProps } from "./button-styles";

type ButtonProps = ButtonStyleProps & {
  children: ReactNode;
  onClick: () => void;
};

const Button = ({ children, icon, onClick, variant }: ButtonProps): ReactNode => (
  <button className={buttonClassName({ icon, variant })} onClick={onClick} type="button">
    {children}
  </button>
);

export { Button };
