# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /repo

# Install with the lockfile against the real workspace layout, so versions are pinned.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/api --include-workspace-root

COPY apps/api apps/api
# The Prisma client is generated code — it must be built, not copied from the host.
RUN cd apps/api && npx prisma generate && npx nest build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/api --include-workspace-root --omit=dev && npm cache clean --force

COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/prisma apps/api/prisma
COPY --from=build /repo/apps/api/prisma.config.ts apps/api/
# src/ is needed because the operational scripts (prisma/seed.ts, prisma/migrate-data.ts)
# import the shared Prisma client factory from it and run under tsx.
COPY --from=build /repo/apps/api/src apps/api/src
COPY --from=build /repo/apps/api/tsconfig.json apps/api/
# The seed's master data — real reference values dumped from the restored backup.
COPY db/seed db/seed
# generate/ holds the Prisma client that `prisma generate` emitted.
COPY --from=build /repo/node_modules/.prisma node_modules/.prisma
COPY --from=build /repo/node_modules/@prisma/client node_modules/@prisma/client
# `prisma migrate deploy` runs at container start, so the CLI has to be in the runtime image.
COPY --from=build /repo/node_modules/prisma node_modules/prisma
COPY apps/api/docker-entrypoint.sh apps/api/

# Don't run as root.
RUN addgroup -S app && adduser -S app -G app && mkdir -p /repo/storage && chown -R app:app /repo
USER app

WORKDIR /repo/apps/api
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
