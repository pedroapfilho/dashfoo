import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { BordersPage } from "./pages/borders";
import { ChromePage } from "./pages/chrome";
import { ControlledPage } from "./pages/controlled";
import { DockingPage } from "./pages/docking";
import { OverviewPage } from "./pages/overview";
import { PersistencePage } from "./pages/persistence";
import { RootLayout } from "./root";

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  component: OverviewPage,
  getParentRoute: () => rootRoute,
  path: "/",
});
const dockingRoute = createRoute({
  component: DockingPage,
  getParentRoute: () => rootRoute,
  path: "/docking",
});
const chromeRoute = createRoute({
  component: ChromePage,
  getParentRoute: () => rootRoute,
  path: "/chrome",
});
const bordersRoute = createRoute({
  component: BordersPage,
  getParentRoute: () => rootRoute,
  path: "/borders",
});
const persistenceRoute = createRoute({
  component: PersistencePage,
  getParentRoute: () => rootRoute,
  path: "/persistence",
});
const controlledRoute = createRoute({
  component: ControlledPage,
  getParentRoute: () => rootRoute,
  path: "/controlled",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dockingRoute,
  chromeRoute,
  bordersRoute,
  persistenceRoute,
  controlledRoute,
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
