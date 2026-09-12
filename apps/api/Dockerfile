# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.34.5

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @documan/api build

# Stage 2: Runner stage
FROM node:22-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

RUN npm install -g pnpm@10.34.5

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/apps/api/dist ./apps/api/dist

RUN mkdir -p /app/apps/api/uploads/documents/versions && chown -R node:node /app

USER node

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health/live || exit 1

CMD ["node", "apps/api/dist/server.js"]
