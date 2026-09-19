import type { FastifyInstance } from "fastify";

import type { ApplicationContainer } from "../../app/build-container.js";

// `/demo` used to serve a self-contained HTML dashboard full of hardcoded balances,
// a fabricated P&L curve and addresses that were not even valid — which meant the
// most prominent link on the landing page led to invented numbers. It now redirects
// to the real dashboard (the Next.js app), where every figure comes from the API.
//
// The redirect target is resolved in this order, so it is correct in each deployment
// shape rather than only one:
//   1. WEB_APP_URL — the web app is deployed as its own service.
//   2. /           — fall back to the API landing page, which documents the priced
//                    endpoints and links to /docs and /llms.txt.
function resolveDashboardTarget(): string {
  const configured = process.env.WEB_APP_URL?.trim();
  if (configured !== undefined && configured.length > 0) {
    return configured;
  }
  return "/";
}

export function registerDashboardRoute(
  app: FastifyInstance,
  _container: ApplicationContainer
): void {
  app.get("/demo", async (_request, reply) => {
    // 302 rather than 301: the target depends on how this process was deployed, so it
    // must not be cached permanently by a browser that later sees a different layout.
    return reply.redirect(resolveDashboardTarget(), 302);
  });
}
