import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";

import { RootLayout } from "./root";

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
const controlledRoute = createRoute({
  component: lazyRouteComponent(() => import("./pages/controlled"), "ImperativeControlPage"),
  getParentRoute: () => rootRoute,
  path: "/controlled",
});
const rawRoute = createRoute({
  component: lazyRouteComponent(() => import("./pages/raw"), "RawPage"),
  getParentRoute: () => rootRoute,
  path: "/raw",
});
const staticRoute = createRoute({
  component: lazyRouteComponent(() => import("./pages/static"), "StaticLayoutPage"),
  getParentRoute: () => rootRoute,
  path: "/static",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dockingRoute,
  controlledRoute,
  rawRoute,
  staticRoute,
]);

const router = createRouter({ defaultPreload: "intent", routeTree });

declare module "@tanstack/react-router" {
  // oxlint-disable-next-line typescript-eslint/consistent-type-definitions
  interface Register {
    router: typeof router;
  }
}

export { router };
