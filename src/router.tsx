import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Serve cached data instantly; refresh in background after 60s.
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload pages (code + data) when a link is hovered/touched.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultStaleTime: 30_000,
    defaultGcTime: 30 * 60_000,
  });

  return router;
};
