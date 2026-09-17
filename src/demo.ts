import { createServer } from "node:http";

import { dashboardHtml } from "./http/routes/dashboard.routes.js";

const port = Number(process.env.DEMO_PORT ?? 3001);

// This is intentionally a UI-only preview. It lets a pitch/demo run without
// PostgreSQL or Redis, while the real API remains available through `npm run dev`.
const server = createServer((request, response) => {
  if (request.url === "/" || request.url === "/demo") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(dashboardHtml);
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found. Open /demo");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Growtrack UI demo: http://localhost:${port}/demo`);
});
