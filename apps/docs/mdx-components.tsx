import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ReactNode } from "react";
import { Children, isValidElement } from "react";

import { DockLocations } from "./components/diagrams/dock-locations";
import { LayoutAnatomy } from "./components/diagrams/layout-anatomy";
import { ModelTree } from "./components/diagrams/model-tree";
import { RowOrientation } from "./components/diagrams/row-orientation";

const codeText = (node: ReactNode): string =>
  Children.toArray(node)
    .map((child): string => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return codeText(child.props.children);
      }
      return "";
    })
    .join("");

const DocsCodeBlock = (props: ComponentProps<"pre">): ReactNode => (
  <CodeBlock
    {...props}
    keepBackground
    viewportProps={{
      "aria-label": `Code example: ${codeText(props.children).trim().slice(0, 100)}`,
    }}
  >
    <Pre>{props.children}</Pre>
  </CodeBlock>
);

export const getMDXComponents = (components?: MDXComponents): MDXComponents => ({
  ...defaultMdxComponents,
  DockLocations,
  LayoutAnatomy,
  ModelTree,
  pre: DocsCodeBlock,
  RowOrientation,
  ...components,
});
