import type { ComponentProps, CSSProperties, ReactNode } from "react";

type StateProp<T, State> = T | ((state: State) => T);

/** A button whose `children`, `className`, `style` and `title` may be functions of its component's state. */
type StatefulButtonProps<State> = Omit<
  ComponentProps<"button">,
  "children" | "className" | "style" | "title"
> & {
  children?: StateProp<ReactNode, State>;
  className?: StateProp<string | undefined, State>;
  style?: StateProp<CSSProperties | undefined, State>;
  title?: StateProp<string | undefined, State>;
};

type ResolvedStateProps = {
  /** Native button props, with the resolved values that are set. */
  buttonProps: ComponentProps<"button">;
  children: ReactNode;
};

/** Unset values stay absent, so a default spread before `buttonProps` survives. */
const resolveStateProps = <State>(
  { children, className, style, title, ...rest }: StatefulButtonProps<State>,
  state: State,
): ResolvedStateProps => {
  const buttonProps: ComponentProps<"button"> = { ...rest };
  const resolvedClassName = typeof className === "function" ? className(state) : className;
  const resolvedStyle = typeof style === "function" ? style(state) : style;
  const resolvedTitle = typeof title === "function" ? title(state) : title;

  if (resolvedClassName !== undefined) {
    buttonProps.className = resolvedClassName;
  }

  if (resolvedStyle !== undefined) {
    buttonProps.style = resolvedStyle;
  }

  if (resolvedTitle !== undefined) {
    buttonProps.title = resolvedTitle;
  }

  return { buttonProps, children: typeof children === "function" ? children(state) : children };
};

export { resolveStateProps };

export type { StatefulButtonProps, StateProp };
