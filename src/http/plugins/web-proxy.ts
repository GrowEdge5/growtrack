import http from "node:http";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Forwards requests for non-API routes (landing page, /wallet/*, /_next/*, /assets/*)
 * to the Next.js web application running on local port 3001.
 */
export function proxyToWeb(
  req: FastifyRequest,
  reply: FastifyReply,
  port = 3001,
  onError?: () => void
): void {
  reply.hijack();
  const url = req.raw.url ?? "/";
  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port,
      path: url,
      method: req.raw.method,
      headers: {
        ...req.raw.headers,
        "x-forwarded-host": req.headers.host,
        "x-forwarded-proto": req.headers["x-forwarded-proto"] ?? "http",
        "x-forwarded-for": req.ip
      }
    },
    (proxyRes) => {
      reply.raw.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(reply.raw);
    }
  );

  proxyReq.on("error", () => {
    if (onError) {
      onError();
    } else {
      reply.raw.writeHead(502, { "content-type": "application/json" });
      reply.raw.end(
        JSON.stringify({
          type: "https://growtrack.dev/problems/gateway-error",
          title: "Frontend Unavailable",
          status: 502,
          detail: "The web frontend service is starting or unreachable.",
          code: "FRONTEND_UNAVAILABLE"
        })
      );
    }
  });

  req.raw.pipe(proxyReq);
}
