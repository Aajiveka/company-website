# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/web --include-workspace-root

COPY apps/web apps/web
# The app talks to /api on its own origin; nginx proxies that to the API container.
RUN cd apps/web && VITE_USE_MOCKS=0 VITE_API_BASE_URL=/api npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
# 127.0.0.1, not localhost: localhost resolves to ::1 first and nginx listens on IPv4 only,
# so the check got "connection refused" and the container reported unhealthy while serving
# traffic perfectly well.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
