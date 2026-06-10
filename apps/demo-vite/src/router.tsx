import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";

import { RootLayout } from "./root";

// Each page is lazily imported so it ships as its own chunk — the initial bundle
// loads only the shell + the landing route, not every demo page at once.
const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  component: lazyRouteComponent(() => import("./pages/overview"), "OverviewPage"),
  getParentRoute: () => rootRoute,
  path: "/",
});
const dockingRoute = createRoute({
  component: lazyRouteComponent(() => import("./pages/docking"), "DockingPage"),
  getParentRoute: () => rootRoute,
  path: "/docking",
});
const chromeRoute = createRoute({
  component: lazyRouteComponent(() => import("./pages/chrome"), "ChromePage"),
  getParentRoute: () => rootRoute,
  path: "/chrome",
});
const collapsibleRoute = createRoute({
  component: lazyRouteComponent(() => import("./pages/collapsible"), "CollapsiblePage"),
  getParentRoute: () => rootRoute,
  path: "/collapsible",
});
const persistenceRoute = createRoute({
  component: lazyRouteComponent(() => import("./pages/persistence"), "PersistencePage"),
  getParentRoute: () => rootRoute,
  path: "/persistence",
});
const controlledRoute = createRoute({
  component: lazyRouteComponent(() => import("./pages/controlled"), "ImperativeControlPage"),
  getParentRoute: () => rootRoute,
  path: "/controlled",
});
const responsiveRoute = createRoute({
  component: lazyRouteComponent(() => import("./pages/responsive"), "ResponsivePage"),
  getParentRoute: () => rootRoute,
  path: "/responsive",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dockingRoute,
  chromeRoute,
  collapsibleRoute,
  persistenceRoute,
  controlledRoute,
  responsiveRoute,
]);

const router = createRouter({ defaultPreload: "intent", routeTree });

declare module "@tanstack/react-router" {
  // Module augmentation requires declaration merging — must stay an interface.
  // oxlint-disable-next-line typescript-eslint/consistent-type-definitions
  interface Register {
    router: typeof router;
  }
}

export { router };
