import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { DockLocations } from "./components/diagrams/dock-locations";
import { LayoutAnatomy } from "./components/diagrams/layout-anatomy";
import { ModelTree } from "./components/diagrams/model-tree";
import { RowOrientation } from "./components/diagrams/row-orientation";

export const getMDXComponents = (components?: MDXComponents): MDXComponents => ({
  ...defaultMdxComponents,
  DockLocations,
  LayoutAnatomy,
  ModelTree,
  RowOrientation,
  ...components,
});
