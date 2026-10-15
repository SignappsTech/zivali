# One image for the API and the worker (ADR-020). Build from the repo root:
#   docker build -f apps/api/Dockerfile -t zivali-api .                                  (this machine's platform)
#   docker buildx build --platform linux/arm64 -f apps/api/Dockerfile -t zivali-api .   (the Hetzner CAX11, Arm64)
# API: default command. Worker: `node dist/worker.js`. Migrations (one-off, per deploy):
#   node node_modules/prisma/build/index.js migrate deploy
# The JS build runs on the build machine's own platform; only the runtime stage runs as the target platform
# (emulated by QEMU when they differ).
FROM --platform=$BUILDPLATFORM node:22-slim AS build
RUN npm install -g pnpm@11.28.5
WORKDIR /repo
COPY . .
# --ignore-scripts: the root `prepare: husky` fails without dev tooling, so the Prisma client is generated here.
# The production dependencies are plain JS (Prisma 7 query compiler is wasm, pg is pure JS), so they are the same
# for every platform.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter api...
RUN cd apps/api && pnpm exec prisma generate && pnpm build
RUN pnpm --filter api deploy --prod --ignore-scripts /out

FROM node:22-slim
# OpenSSL for Prisma's schema engine (migrations). pg_dump for the worker's db.backup job (ADR-016): Debian's client
# is older than Supabase's Postgres 17 and pg_dump refuses newer servers, so postgresql-client-17 comes from PGDG.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
	&& install -d /usr/share/postgresql-common/pgdg \
	&& curl -fsSo /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
	&& echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(. /etc/os-release && echo "$VERSION_CODENAME")-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
	&& apt-get update && apt-get install -y --no-install-recommends postgresql-client-17 \
	&& apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma.config.ts ./
COPY --from=build /repo/apps/api/prisma/schemas ./prisma/schemas
# Fetch the schema engine for the target platform (linux-arm64 on the VPS) here, as root: the runtime user cannot
# write to node_modules.
RUN node node_modules/prisma/build/index.js version
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
