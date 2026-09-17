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
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
# START_SCRIPT picks the entrypoint per service (main.js = api, worker.js = worker).
CMD ["sh", "-c", "node dist/${START_SCRIPT:-main}.js"]
