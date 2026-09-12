# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.34.5

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

# Stage 2: Nginx Runner stage
FROM nginx:1.27-alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

RUN touch /tmp/nginx.pid && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx /tmp/nginx.pid /tmp

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
