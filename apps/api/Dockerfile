# One image for the API and the worker (ADR-020). Build from the repo root:
#   docker build -f apps/api/Dockerfile -t zivali-api .                                  (this machine's platform)
#   docker buildx build --platform linux/arm64 -f apps/api/Dockerfile -t zivali-api .   (the Hetzner CAX11, Arm64)
# API: default command. Worker: `node dist/worker.js`. Migrations, then the seed (one-off each, per deploy):
#   node node_modules/prisma/build/index.js migrate deploy
#   node dist/seed/apps/api/prisma/seed.js
# The JS build runs on the build machine's own platform; only the runtime stage runs as the target platform
# (emulated by QEMU when they differ).
FROM --platform=$BUILDPLATFORM node:22-slim AS base
RUN npm install -g pnpm@11.28.5
WORKDIR /repo

# Only what `pnpm install` reads (TASK-4.7): the lockfile, the workspace config and the workspace's package.json files.
# This step reruns on every commit (the bind mount is the whole context), but its output changes only with those files,
# so the install layer below stays cached across source-only commits (deploy.mjs keeps every stage's layers, mode=max).
FROM base AS manifests
# sharp (photo.process) is the one native production dependency: its binary and libvips come from the
# @img/sharp-<os>-<cpu> optional dependencies, and pnpm installs only the build machine's by default. Adding the
# target's (TARGETARCH amd64 → x64, arm64 stays) lets the runtime stage load linux-arm64 sharp on the CAX11.
ARG TARGETARCH
RUN --mount=type=bind,target=/ctx mkdir /manifests && cd /ctx \
	&& cp --parents pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json apps/*/package.json packages/*/package.json \
		/manifests \
	&& printf 'supportedArchitectures:\n  os: [current, linux]\n  cpu: [current, %s]\n  libc: [current, glibc]\n' \
		"$([ "$TARGETARCH" = amd64 ] && echo x64 || echo "${TARGETARCH:-current}")" >> /manifests/pnpm-workspace.yaml

FROM base AS build
COPY --from=manifests /manifests ./
# --ignore-scripts: the root `prepare: husky` fails without dev tooling, so the Prisma client is generated here.
# The other production dependencies are plain JS (Prisma 7 query compiler is wasm, pg is pure JS).
RUN pnpm install --frozen-lockfile --ignore-scripts --filter api...
COPY . .
# The source brings back the plain pnpm-workspace.yaml; `pnpm deploy` below installs again and needs the target's
# architectures too.
COPY --from=manifests /manifests/pnpm-workspace.yaml ./
# The worker renders push and email text from the merged i18n catalogues (dist/*.json, bundled by tsup).
RUN pnpm --filter @zivali/i18n build
RUN cd apps/api && pnpm exec prisma generate && pnpm build
RUN pnpm --filter api deploy --prod --ignore-scripts /out

FROM node:22-slim
# OpenSSL for Prisma's schema engine (migrations). pg_dump for the worker's db.backup job (ADR-016): Debian's client
# is older than Supabase's Postgres 17 and pg_dump refuses newer servers, so postgresql-client-17 comes from PGDG.
# Retries: a flaky network (or DNS under emulation) should not fail the image.
RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80retries \
	&& apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
	&& install -d /usr/share/postgresql-common/pgdg \
	&& curl -fsSo /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --retry 5 https://www.postgresql.org/media/keys/ACCC4CF8.asc \
	&& echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(. /etc/os-release && echo "$VERSION_CODENAME")-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
	&& apt-get update && apt-get install -y --no-install-recommends postgresql-client-17 \
	&& apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
# The invoice PDF fonts (lib/invoice-pdf.ts finds them at ../assets from dist/).
COPY apps/api/assets ./assets
COPY --from=build /repo/apps/api/prisma.config.ts ./
COPY --from=build /repo/apps/api/prisma/schemas ./prisma/schemas
# The reference data the seed loads in every environment (01-geo, 02-geo-places, 05-directory), where the bundled
# seeders look for it: dist/seed/ mirrors the repo (tsup.config.ts). The fixture photos (local only) stay out.
COPY apps/api/prisma/seeders/data/*.csv ./dist/seed/apps/api/prisma/seeders/data/
COPY scripts/geo-to-sql.mjs ./dist/seed/scripts/
COPY supabase/seed/geo/ ./dist/seed/supabase/seed/geo/
# Fetch the schema engine for the target platform (linux-arm64 on the VPS) here, as root: the runtime user cannot
# write to node_modules.
RUN node node_modules/prisma/build/index.js version
# sharp loads its platform binary at require time: fail the build here, not at the first photo.process.
RUN node -e "require('sharp')"
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
