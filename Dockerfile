FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM dependencies AS build
WORKDIR /app
COPY prisma ./prisma
COPY tsconfig*.json package.json ./
COPY src ./src
COPY web ./web
RUN npx prisma generate && npm run build:api && npm run build:web

# Web Frontend service (Next.js standalone runtime)
FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static ./web/.next/static
COPY --from=build /app/web/public ./web/public
EXPOSE 3001
CMD ["node", "web/server.js"]

# API & Worker service (Fastify runtime - default target)
FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
# START_SCRIPT picks the entrypoint per service (main.js = api, worker.js = worker).
CMD ["sh", "-c", "node dist/${START_SCRIPT:-main}.js"]
