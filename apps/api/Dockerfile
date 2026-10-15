# One image for the API and the worker (ADR-020). Build from the repo root:
#   docker build -f apps/api/Dockerfile -t zivali-api .
# API: default command. Worker: `node dist/worker.js`. Migrations (one-off, per deploy): `npx prisma migrate deploy`.
FROM node:22-slim AS base
# OpenSSL for Prisma's schema engine (migrations); the API itself talks to Postgres through node-postgres.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

FROM base AS build
RUN npm install -g pnpm@11.28.5
WORKDIR /repo
COPY . .
# --ignore-scripts: the root `prepare: husky` fails without dev tooling, so the Prisma client is generated here.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter api...
# The worker renders push and email text from the merged i18n catalogues (dist/*.json, bundled by tsup).
RUN pnpm --filter @zivali/i18n build
RUN cd apps/api && pnpm exec prisma generate && pnpm build
RUN pnpm --filter api deploy --prod --ignore-scripts /out
# Fetch the schema engine for this platform now; the runtime user cannot write to node_modules.
RUN cd /out && node node_modules/prisma/build/index.js version

FROM base
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma.config.ts ./
COPY --from=build /repo/apps/api/prisma/schemas ./prisma/schemas
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
